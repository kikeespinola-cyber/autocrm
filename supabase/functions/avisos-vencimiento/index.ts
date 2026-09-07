// Avisos de vencimiento por email. La dispara un pg_cron diario (12:00 UTC =
// 9:00 Paraguay), nunca la app.
//
// Por qué existe: Apple 3.1.1 no deja mostrar CTAs de activación ni precios
// adentro de la app, así que el aviso de "se te vence" y el "cómo activás"
// tienen que salir por un canal externo. Acá el canal es el email, y el CTA es
// un botón a WhatsApp.
//
// Autenticación: NO usa verify_jwt (ver supabase/config.toml). No hay usuario
// logueado del otro lado — es Postgres llamando por pg_net. La barrera es el
// header X-Cron-Secret contra CRON_SECRET del entorno, y es la ÚNICA barrera:
// sin ella la función queda abierta a cualquiera que sepa la URL y pueda
// disparar emails desde el dominio verificado. No la aflojes.
//
// Idempotencia: cada envío marca aviso_previo_enviado_at o
// aviso_vencido_enviado_at en subscriptions. La función SQL
// avisos_vencimiento_pendientes() filtra por "is null", así que una segunda
// corrida el mismo día no manda nada. Las ventanas de fecha son anchas (3 días
// hacia adelante, 7 hacia atrás) justamente porque el antiduplicado es esa
// marca y no la ventana: si el cron falla un día, al siguiente recupera a los
// que se saltearon en vez de perderlos para siempre.

import { createClient } from '@supabase/supabase-js'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const REMITENTE = 'Vendix <noreply@vendixcrm.com>'
const REPLY_TO = 'kikeespinola@gmail.com'
const WHATSAPP = '595985715389'
const SITIO = 'https://vendixcrm.com'

// Paleta de marca (src/lib/theme.ts). En email va todo inline: Gmail y Outlook
// descartan <style> en el head, así que no hay clases que valgan.
const CYAN = '#04dedf'
const NEGRO = '#1A1A2E'
const FONDO = '#F5F7F8'
const GRIS = '#6B7280'

// Resend limita a 2 requests por segundo en el plan base. Con una tanda grande
// de vencimientos el mismo día, mandar en loop cerrado devuelve 429 y los
// últimos quedan sin aviso. Medio segundo entre envíos alcanza y sobra.
const PAUSA_MS = 600

type Tipo = 'previo' | 'vencido'

type Fila = {
  user_id: string
  email: string
  nombre_vendedor: string | null
  status: string
  current_period_end: string
  tipo: Tipo
  dias_restantes: number
}

type Copy = {
  asunto: string
  titulo: string
  parrafos: string[]
  caja?: { titulo: string; lineas: string[] }
  botonTexto: string
  waTexto: string
}

// ---------------------------------------------------------------------------
// Seguridad
// ---------------------------------------------------------------------------

// Comparación sin salida temprana por carácter. La diferencia de timing acá es
// mínima y difícil de explotar sobre HTTP, pero el costo de hacerlo bien son
// cinco líneas.
function secretoValido(recibido: string | null, esperado: string): boolean {
  if (!recibido) return false

  const a = new TextEncoder().encode(recibido)
  const b = new TextEncoder().encode(esperado)
  if (a.length !== b.length) return false

  let dif = 0
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i]
  return dif === 0
}

// ---------------------------------------------------------------------------
// Copies
// ---------------------------------------------------------------------------

// El nombre puede venir null (el onboarding lo pide, pero la fila se crea
// antes). Se usa sólo el primer nombre: "Hola, Juan Carlos" suena a formulario.
function saludo(nombre: string | null): string {
  const limpio = (nombre ?? '').trim()
  if (!limpio) return 'Hola'
  return `Hola, ${limpio.split(/\s+/)[0]}`
}

function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios
}

function armarCopy(f: Fila): Copy {
  const n = f.dias_restantes
  const dias = `${n} ${plural(n, 'día', 'días')}`

  // Trial y plan pagado son dos conversaciones distintas: al de prueba hay que
  // decirle cuánto sale y que no pierde nada; al que ya pagó, sólo que renueve.
  const esTrial = f.status === 'trial'

  if (f.tipo === 'previo' && esTrial) {
    return {
      asunto: `Te ${plural(n, 'queda', 'quedan')} ${dias} de prueba en Vendix`,
      titulo: `Te ${plural(n, 'queda', 'quedan')} ${dias} de prueba`,
      parrafos: [
        'Estos días usaste Vendix para lo que más cuesta sostener a mano: tener cada cliente ordenado, saber a quién tocaba llamar hoy y que ninguna oportunidad se te pase de largo.',
        `En ${dias} termina tu prueba. Tus clientes, sus historiales y tus recordatorios quedan guardados tal cual están — no se borra nada. Lo único que pasa es que la app deja de abrirse hasta que actives.`,
        'Para activar escribinos por WhatsApp y lo resolvemos en el momento.',
      ],
      caja: {
        titulo: 'Planes',
        lineas: [
          'Gs. 50.000 por mes',
          'Gs. 500.000 por año — te ahorrás dos meses',
        ],
      },
      botonTexto: 'Quiero seguir con Vendix',
      waTexto: `Hola! Quiero activar Vendix, me ${plural(n, 'queda', 'quedan')} ${dias} de prueba.`,
    }
  }

  if (f.tipo === 'previo') {
    return {
      asunto: `Tu plan de Vendix vence en ${dias}`,
      titulo: `Tu plan vence en ${dias}`,
      parrafos: [
        `Te escribimos para avisarte que tu plan de Vendix vence en ${dias}.`,
        'Para renovarlo escribinos por WhatsApp y lo dejamos activo en el momento, sin que se te corte el acceso ni pierdas nada de lo que cargaste.',
      ],
      botonTexto: 'Quiero seguir con Vendix',
      waTexto: `Hola! Quiero renovar mi plan de Vendix, me vence en ${dias}.`,
    }
  }

  if (esTrial) {
    return {
      asunto: 'Tu prueba de Vendix terminó — tus clientes te esperan',
      titulo: 'Tu prueba terminó',
      parrafos: [
        'Se terminaron tus días de prueba y la app dejó de abrirse. Pero no perdiste nada: tus clientes, sus historiales, tus recordatorios y tu pipeline están intactos, esperándote.',
        'Activás escribiéndonos por WhatsApp. Apenas confirmamos, volvés a entrar y encontrás todo exactamente como lo dejaste.',
      ],
      caja: {
        titulo: 'Planes',
        lineas: [
          'Gs. 50.000 por mes',
          'Gs. 500.000 por año — te ahorrás dos meses',
        ],
      },
      botonTexto: 'Quiero seguir con Vendix',
      waTexto: 'Hola! Se me terminó la prueba de Vendix y quiero activar mi cuenta.',
    }
  }

  return {
    asunto: 'Tu plan de Vendix venció',
    titulo: 'Tu plan venció',
    parrafos: [
      'Tu plan de Vendix venció y por eso la app dejó de abrirse. Tus clientes y todo tu historial siguen guardados, no se borra nada.',
      'Renovalo escribiéndonos por WhatsApp y volvés a entrar enseguida.',
    ],
    botonTexto: 'Quiero seguir con Vendix',
    waTexto: 'Hola! Se me venció el plan de Vendix y quiero renovarlo.',
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

// Los copies son texto nuestro, no input de nadie, pero el nombre del vendedor
// sí viene de la base y termina adentro del HTML. Escapar es más barato que
// razonar sobre qué puede llegar a tener.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function enlaceWhatsApp(texto: string): string {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`
}

// Layout de tablas anidadas y no flex/grid: es lo único que renderiza parejo
// en Gmail, Outlook y el cliente de iOS.
function armarHtml(f: Fila, copy: Copy): string {
  const url = enlaceWhatsApp(copy.waTexto)

  const parrafos = copy.parrafos
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${NEGRO};">${esc(p)}</p>`,
    )
    .join('')

  const caja = copy.caja
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
         <tr>
           <td style="background:${FONDO};border-left:4px solid ${CYAN};border-radius:8px;padding:16px 18px;">
             <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:${GRIS};">${esc(copy.caja.titulo)}</p>
             ${copy.caja.lineas
               .map(
                 (l) =>
                   `<p style="margin:0 0 4px;font-size:17px;font-weight:700;color:${NEGRO};">${esc(l)}</p>`,
               )
               .join('')}
           </td>
         </tr>
       </table>`
    : ''

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(copy.asunto)}</title>
</head>
<body style="margin:0;padding:0;background:${FONDO};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(copy.parrafos[0].slice(0, 120))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

        <tr>
          <td style="background:${CYAN};padding:28px 32px;">
            <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:${NEGRO};">Vendix</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${NEGRO};opacity:0.72;">Vendé con inteligencia.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0 0 6px;font-size:15px;color:${GRIS};">${esc(saludo(f.nombre_vendedor))},</p>
            <h1 style="margin:0 0 20px;font-size:23px;line-height:1.3;font-weight:800;color:${NEGRO};">${esc(copy.titulo)}</h1>
            ${parrafos}
            ${caja}
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${CYAN};border-radius:12px;">
                  <a href="${url}" style="display:block;padding:17px 30px;font-size:17px;font-weight:800;color:${NEGRO};text-decoration:none;">${esc(copy.botonTexto)}</a>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-size:13px;color:${GRIS};">Te abre WhatsApp con el mensaje ya escrito.</p>
          </td>
        </tr>

        <tr>
          <td style="background:${FONDO};padding:20px 32px;">
            <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${GRIS};">Si ya activaste, ignorá este mensaje.</p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:${GRIS};">
              <a href="${SITIO}" style="color:${GRIS};text-decoration:underline;">vendixcrm.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// Los clientes de email castigan al HTML sin alternativa de texto plano, y hay
// gente que lee con imágenes y estilos apagados. Sale de los mismos copies.
function armarTexto(f: Fila, copy: Copy): string {
  const bloques = [
    `${saludo(f.nombre_vendedor)},`,
    copy.titulo,
    ...copy.parrafos,
  ]

  if (copy.caja) {
    bloques.push(`${copy.caja.titulo}:\n${copy.caja.lineas.map((l) => `- ${l}`).join('\n')}`)
  }

  bloques.push(`${copy.botonTexto}: ${enlaceWhatsApp(copy.waTexto)}`)
  bloques.push('Si ya activaste, ignorá este mensaje.')
  bloques.push(SITIO)

  return bloques.join('\n\n')
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------

async function enviarResend(apiKey: string, f: Fila, copy: Copy): Promise<void> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: REMITENTE,
      to: [f.email],
      reply_to: REPLY_TO,
      subject: copy.asunto,
      html: armarHtml(f, copy),
      text: armarTexto(f, copy),
    }),
  })

  if (!res.ok) {
    // El cuerpo de error de Resend dice cuál es el problema (dominio no
    // verificado, destinatario inválido, rate limit). Sin él, el log es inútil.
    const detalle = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${detalle.slice(0, 300)}`)
  }
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  // Falta de secret es 500 y no "pasa igual": una función que se abre sola
  // cuando le falta una variable de entorno es la peor clase de bug.
  if (!cronSecret) {
    return json({ error: 'Falta CRON_SECRET en el entorno' }, 500)
  }

  if (!secretoValido(req.headers.get('x-cron-secret'), cronSecret)) {
    return json({ error: 'No autorizado' }, 401)
  }

  if (!resendKey) return json({ error: 'Falta RESEND_API_KEY en el entorno' }, 500)
  if (!url || !serviceKey) return json({ error: 'Falta la config de Supabase' }, 500)

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // El join contra auth.users y las ventanas de fecha viven en SQL: PostgREST
  // no expone el esquema auth, y así el now() de la comparación es el mismo
  // reloj que dispara el cron. Ver migración 20260906000000.
  const { data, error } = await admin.rpc('avisos_vencimiento_pendientes')

  if (error) {
    return json({ error: `No se pudo leer los pendientes: ${error.message}` }, 500)
  }

  const filas = (data ?? []) as Fila[]
  let enviados = 0
  let fallidos = 0
  const detalle: { email: string; tipo: Tipo; ok: boolean; error?: string }[] = []

  for (const [i, f] of filas.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSA_MS))

    const copy = armarCopy(f)

    try {
      // Mandar primero, marcar después, y a propósito. Si el update falla, el
      // peor caso es un email repetido mañana. Al revés, el peor caso es un
      // usuario marcado como avisado que nunca recibió nada.
      await enviarResend(resendKey, f, copy)

      const columna = f.tipo === 'previo'
        ? 'aviso_previo_enviado_at'
        : 'aviso_vencido_enviado_at'

      const { error: errorMarca } = await admin
        .from('subscriptions')
        .update({ [columna]: new Date().toISOString() })
        .eq('user_id', f.user_id)

      if (errorMarca) throw new Error(`Enviado pero sin marcar: ${errorMarca.message}`)

      enviados++
      detalle.push({ email: f.email, tipo: f.tipo, ok: true })
    } catch (e) {
      // Un destinatario que falla no puede cortar la tanda: el resto de la
      // gente que vence hoy tiene que recibir su aviso igual.
      fallidos++
      const mensaje = e instanceof Error ? e.message : String(e)
      detalle.push({ email: f.email, tipo: f.tipo, ok: false, error: mensaje })
      console.error(`[avisos-vencimiento] ${f.tipo} ${f.email}: ${mensaje}`)
    }
  }

  console.log(`[avisos-vencimiento] candidatos=${filas.length} enviados=${enviados} fallidos=${fallidos}`)

  return json({ enviados, fallidos, detalle })
})
