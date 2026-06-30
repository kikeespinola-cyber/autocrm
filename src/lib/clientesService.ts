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

// Traer clientes que necesitan contacto hoy según protocolo
export async function getClientsDueToday(): Promise<Client[]> {
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

  // Actualizar contador y fecha de último contacto
  await supabase
    .from('clients')
    .update({
      last_contact_at: new Date().toISOString(),
      contact_count: supabase.rpc('increment', { row_id: clientId }),
    })
    .eq('id', id)
}