import { supabase } from './supabase'
import { Client, Reminder } from './types'

// Traer todos los clientes
export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Traer recordatorios de hoy
export async function getRemindersToday(): Promise<Reminder[]> {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)

  const { data, error } = await supabase
    .from('reminders')
    .select('*, clients(name, temperature)')
    .eq('completed', false)
    .gte('due_at', hoy.toISOString())
    .lt('due_at', manana.toISOString())
    .order('due_at', { ascending: true })

  if (error) throw error
  return data || []
}

// Traer clientes con fecha de contacto fijada a mano que ya venció.
// Ojo: next_contact_at sólo se escribe desde la ficha del cliente (la regla
// automática de protocolo.ts se calcula en memoria y no se persiste), así que
// esto NO devuelve todo lo que toca contactar hoy — eso lo arma "Tu día" en
// memoria con necesitaContactoHoy(). Hoy no se llama desde ninguna pantalla.
export async function getClientesConFechaVencida(): Promise<Client[]> {
  const ahora = new Date().toISOString()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('sold', false)
    .lte('next_contact_at', ahora)
    .order('temperature', { ascending: true })

  if (error) throw error
  return data || []
}

// Agregar un cliente nuevo
export async function addClient(client: Partial<Client>): Promise<Client> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...client, user_id: user?.id })
    .select()
    .single()

  if (error) throw error
  return data
}
// Actualizar temperatura
export async function updateTemperature(id: string, temperature: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .update({ temperature })
    .eq('id', id)

  if (error) throw error
}

// Registrar una interacción
export async function addInteraction(clientId: string, type: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('interactions')
    .insert({ client_id: clientId, type, content })
  if (error) throw error

  const { error: errorContador } = await supabase
    .rpc('incrementar_contacto', { p_client_id: clientId })
  if (errorContador) throw errorContador
}
