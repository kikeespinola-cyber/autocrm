// Definiciones de tipos de Vendix.
//
// Espejo del esquema real de Supabase, verificado contra information_schema.
// Si tocas una columna en la base, actualiza este archivo en el mismo cambio.
//
// Criterio de nullability: las columnas que en el DDL son nullable pero tienen
// default (temperature, sold, contact_count, created_at, ...) se declaran
// no-null, porque en la practica siempre llegan con valor. Las que pueden ser
// null de verdad llevan "| null".

export type Temperatura = 'hot' | 'warm' | 'cold'

export type Origen = 'salon' | 'red_social' | 'referido' | 'pauta' | 'otro'

export type Etapa = 'interesado' | 'evaluando' | 'objecion' | 'documentos' | 'cierre'

export interface Client {
  id: string
  user_id: string
  name: string
  phone: string | null
  email: string | null              // existe en la base, sin uso en la app
  vehicle_interest: string | null
  budget: string | null             // texto libre, no numerico
  job: string | null
  birthday: string | null           // texto libre ("12 de marzo"), no date
  club: string | null
  kids: number                      // default 0; existe en la base, sin uso en la app
  source: string | null             // legacy: la app usa origen
  temperature: Temperatura          // default 'cold'
  origen: Origen | null
  etapa: Etapa | null
  sold: boolean                     // default false
  sale_date: string | null          // date (YYYY-MM-DD)
  docs_received: boolean            // default false; la app la lee pero nunca la escribe
  comentario_clave: string | null
  motivo_descarte: string | null
  calificacion: number | null       // 1 a 5 estrellas
  notes: string | null
  contact_count: number             // default 0
  last_contact_at: string | null
  next_contact_at: string | null    // fecha de contacto fijada a mano desde la ficha; null = manda la regla de temperatura
  vehicle_photo_url: string | null
  created_at: string                // default now()
  updated_at: string                // default now(); getClients() ordena por esta columna
}

export interface Interaction {
  id: string
  client_id: string
  type: string
  content: string | null
  created_at: string
  // La tabla no tiene user_id: el aislamiento por RLS va por el join contra clients.
}

export interface Reminder {
  id: string
  client_id: string
  type: string | null
  note: string | null
  due_at: string                    // timestamptz, not null
  completed: boolean                // default false
  created_at: string
  // Tabla real, pero hoy sin uso: getRemindersToday() no se llama desde ninguna pantalla.
}

export interface Reunion {
  id: string
  user_id: string
  client_id: string | null
  titulo: string
  fecha: string                     // date (YYYY-MM-DD)
  hora: string                      // time (HH:MM:SS)
  notas: string | null
  completada: boolean               // default false
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  status: string                    // default 'trial'
  plan: string                      // default 'individual'
  current_period_end: string        // default now() + 14 dias
  is_admin: boolean                 // default false
  onboarding_completado: boolean    // default false
  nombre_vendedor: string | null
  concesionaria: string | null
  marca_vehiculo: string | null
  avatar_url: string | null
  racha_dias: number                // default 0
  ultimo_acceso: string | null      // date (YYYY-MM-DD)
  insignias: string[]               // default {}; existe en la base, racha.ts las calcula en JS y no las persiste
  tooltips_vistos: string[]         // default {}
  meta_mensual: number              // default 0
  // Avisos de vencimiento por email. NULL = pendiente en este ciclo. Los escribe
  // solo la Edge Function avisos-vencimiento con service role; la app no puede
  // (no estan en el grant update de authenticated) y hoy tampoco los lee.
  aviso_previo_enviado_at: string | null
  aviso_vencido_enviado_at: string | null
  created_at: string
  updated_at: string
  // subscriptions hace de tabla de perfil ademas de suscripcion.
}
