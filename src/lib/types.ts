// Definiciones de tipos de Vendix

export type Temperatura = 'hot' | 'warm' | 'cold'

export type Origen = 'salon' | 'red_social' | 'referido' | 'pauta' | 'otro'

export type Etapa = 'interesado' | 'evaluando' | 'objecion' | 'documentos' | 'cierre'

export interface Client {
  id: string
  user_id: string
  name: string
  phone: string | null
  vehicle_interest: string | null
  budget: string | null
  job: string | null
  birthday: string | null
  club: string | null
  temperature: Temperatura
  origen: Origen | null
  etapa: Etapa | null
  sold: boolean
  sale_date: string | null
  docs_received: boolean
  comentario_clave: string | null
  motivo_descarte: string | null
  calificacion: number | null
  notes: string | null
  contact_count: number
  last_contact_at: string | null
  vehicle_photo_url: string | null
  created_at: string
}

export interface Interaction {
  id: string
  client_id: string
  type: string
  content: string | null
  created_at: string
}

export interface Reminder {
  id: string
  client_id: string
  fecha: string
  nota: string | null
  completado: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  status: string
  current_period_end: string | null
  is_admin: boolean
  onboarding_completado: boolean
  nombre_vendedor: string | null
  concesionaria: string | null
  marca_vehiculo: string | null
  avatar_url: string | null
  racha_dias: number | null
  meta_mensual: number | null
  plan: string | null
  created_at: string
}

export interface Reunion {
  id: string
  user_id: string
  client_id: string | null
  titulo: string
  fecha: string
  hora: string
  notas: string | null
  completada: boolean
  created_at: string
}
