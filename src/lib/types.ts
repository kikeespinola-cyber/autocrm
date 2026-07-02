export type Temperature = 'hot' | 'warm' | 'cold'
export type InteractionType = 'call' | 'whatsapp' | 'visit' | 'note' | 'lead' | 'sale'
export type ReminderType = 'follow_up' | 'birthday' | 'maintenance' | 'event' | 'referral'
export type Etapa = 'interesado' | 'evaluando' | 'objecion' | 'documentos' | 'cierre'
export type Origen = 'salon' | 'red_social' | 'referido' | 'pauta' | 'otro'

export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  vehicle_interest: string | null
  budget: string | null
  temperature: Temperature
  docs_received: boolean
  birthday: string | null
  club: string | null
  kids: number
  job: string | null
  source: string | null
  notes: string | null
  sold: boolean
  sale_date: string | null
  contact_count: number
  last_contact_at: string | null
  next_contact_at: string | null
  created_at: string
  updated_at: string
  comentario_clave?: string | null
  etapa?: Etapa | null
  origen?: Origen | null
}

export interface Interaction {
  id: string
  client_id: string
  type: InteractionType
  content: string | null
  created_at: string
}

export interface Reminder {
  id: string
  client_id: string
  type: ReminderType
  note: string | null
  due_at: string
  completed: boolean
  created_at: string
}