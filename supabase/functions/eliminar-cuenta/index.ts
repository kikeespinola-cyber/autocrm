// Eliminación de cuenta — Apple 5.1.1(v): si la app deja crear una cuenta,
// tiene que dejar borrarla desde adentro, sin mandar a escribir un mail.
//
// La identidad sale EXCLUSIVAMENTE del JWT del header Authorization. El body no
// se lee nunca y no existe ningún parámetro user_id: por construcción no hay
// forma de pedir el borrado de otra cuenta. Es el único control de "solo a sí
// mismo", así que no agregar parámetros de identidad acá.
//
// Dos clientes distintos a propósito:
//   anon + JWT del usuario  -> resolver quién es (respeta RLS, no puede más)
//   service role            -> borrar (saltea RLS) y auth.admin.deleteUser
//
// Atomicidad: no la hay. Se tocan Postgres, Storage y Auth, que son tres
// sistemas separados, y ninguna transacción los abarca. El diseño es otro:
// nada se toca hasta tener la identidad resuelta (ahí caen casi todas las
// fallas reales, y en esas la cuenta queda intacta), y a partir de ahí todo
// paso es idempotente — deletes por user_id/client_id, remove sobre rutas — así
// que reintentar completa lo que haya quedado a medias.

import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

// Tablas que NO referencian a clients: se borran después, ya sin restricciones.
const TABLAS_POR_USER_ID = [
  'anuncios_historial',
  'pautas',
  'vehiculos_catalogo',
  'ia_uso_diario',
]

const BUCKETS = ['avatars', 'vehiculos', 'catalogo']

// list() de Storage tiene tope por request, así que se pagina. Sin esto, un
// vendedor con más archivos que el tope se quedaría con fotos sin borrar y la
// eliminación sería incompleta en silencio — justo lo que 5.1.1(v) no perdona.
const PAGINA_STORAGE = 100

// remove() acepta un array, pero mandarle miles de rutas de una es tentar al
// límite de payload. Se borra en lotes de este tamaño.
const LOTE_BORRADO = 100

// Devuelve el error con el paso donde se cortó, para que la UI pueda decir algo
// más útil que "falló".
function fallo(paso: string, detalle: string, status = 500) {
  return new Response(
    JSON.stringify({ error: detalle, paso }),
    { status, headers: JSON_HEADERS },
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    // ---------------------------------------------------------------------
    // 1. Identidad. Nada se borra si este bloque no termina bien.
    // ---------------------------------------------------------------------

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return fallo('auth', 'Falta el token de sesión', 401)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!serviceKey) {
      return fallo('config', 'Falta SUPABASE_SERVICE_ROLE_KEY en el entorno')
    }

    const clienteUsuario = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: errorUser } = await clienteUsuario.auth.getUser()
    if (errorUser || !user) {
      return fallo('auth', 'Sesión inválida o vencida', 401)
    }

    const uid = user.id

    // ---------------------------------------------------------------------
    // 2. A partir de acá se borra. Todo con service role.
    // ---------------------------------------------------------------------

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 2.1 — Los ids de clientes, antes de borrar clients: son la única forma de
    // alcanzar interactions y reminders.
    const { data: clientes, error: errorClientes } = await admin
      .from('clients')
      .select('id')
      .eq('user_id', uid)

    if (errorClientes) {
      return fallo('leer_clientes', errorClientes.message)
    }

    const clientIds = (clientes ?? []).map((c: { id: string }) => c.id)

    // 2.2 — Hijas de clients. Con la lista vacía se saltean: un .in() sobre []
    // es un no-op, pero evitarlo deja el log más claro.
    if (clientIds.length > 0) {
      for (const tabla of ['interactions', 'reminders']) {
        const { error } = await admin.from(tabla).delete().in('client_id', clientIds)
        if (error) return fallo(tabla, error.message)
      }
    }

    // 2.3 — reuniones también apunta a clients (client_id, nullable), así que va
    // antes que clients o el delete de abajo choca contra la FK. Se borra por
    // user_id y no por client_id: así se llevan también las reuniones sueltas,
    // las que se cargaron sin cliente asociado.
    const { error: errorReuniones } = await admin
      .from('reuniones')
      .delete()
      .eq('user_id', uid)
    if (errorReuniones) {
      return fallo('reuniones', errorReuniones.message)
    }

    // 2.4 — clients, ya sin nada colgando.
    const { error: errorBorrarClientes } = await admin
      .from('clients')
      .delete()
      .eq('user_id', uid)
    if (errorBorrarClientes) {
      return fallo('clients', errorBorrarClientes.message)
    }

    // 2.5 — El resto de las tablas del usuario. subscriptions NO va acá: es la
    // fila que usa el gating de index.tsx, y se deja para el final para achicar
    // la ventana en la que un fallo dejaría al usuario logueado con la app rota.
    for (const tabla of TABLAS_POR_USER_ID) {
      const { error } = await admin.from(tabla).delete().eq('user_id', uid)
      if (error) return fallo(tabla, error.message)
    }

    // 2.6 — Storage. Los tres buckets usan el user id como prefijo de carpeta
    // (avatars/<uid>/avatar.jpg, vehiculos/<uid>/<client_id>.jpg,
    // catalogo/<uid>/<timestamp>.jpg), así que un list del prefijo alcanza y no
    // hay riesgo de tocar archivos de otro usuario.
    //
    // Va en dos fases: primero se juntan TODAS las rutas paginando, y recién
    // después se borran. Listar y borrar intercalado correría el offset bajo los
    // pies — cada remove acorta la lista y la página siguiente se saltearía
    // archivos, que es la forma silenciosa de dejar fotos atrás.
    for (const bucket of BUCKETS) {
      const rutas: string[] = []
      let offset = 0

      while (true) {
        const { data: pagina, error: errorList } = await admin
          .storage
          .from(bucket)
          .list(uid, {
            limit: PAGINA_STORAGE,
            offset,
            // Orden explícito: el offset sólo es estable si el criterio no
            // cambia entre páginas.
            sortBy: { column: 'name', order: 'asc' },
          })

        // Un bucket sin carpeta para este usuario devuelve lista vacía, no error.
        if (errorList) return fallo(`storage:${bucket}`, errorList.message)
        if (!pagina || pagina.length === 0) break

        for (const archivo of pagina) {
          rutas.push(`${uid}/${archivo.name}`)
        }

        // Página incompleta = era la última. Corta un request de más.
        if (pagina.length < PAGINA_STORAGE) break
        offset += PAGINA_STORAGE
      }

      for (let i = 0; i < rutas.length; i += LOTE_BORRADO) {
        const lote = rutas.slice(i, i + LOTE_BORRADO)
        const { error: errorRemove } = await admin.storage.from(bucket).remove(lote)
        if (errorRemove) return fallo(`storage:${bucket}`, errorRemove.message)
      }
    }

    // 2.7 — subscriptions, anteúltima.
    const { error: errorSub } = await admin
      .from('subscriptions')
      .delete()
      .eq('user_id', uid)
    if (errorSub) {
      return fallo('subscriptions', errorSub.message)
    }

    // 2.8 — El usuario de Auth, último. Después de esto el JWT queda muerto,
    // por eso la app hace signOut local y no depende de una llamada al servidor.
    const { error: errorAuth } = await admin.auth.admin.deleteUser(uid)
    if (errorAuth) {
      return fallo('auth_delete', errorAuth.message)
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: JSON_HEADERS },
    )
  } catch (e) {
    return fallo('inesperado', e instanceof Error ? e.message : String(e))
  }
})
