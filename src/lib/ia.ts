import { supabase } from './supabase'

export interface IAResponse {
  sugerencia: string
  mensaje: string
}

export async function generarSugerencia(
  clientName: string,
  vehiculo: string | null,
  temperatura: string,
  contactCount: number,
  historial: { type: string; content: string | null; created_at: string }[]
): Promise<IAResponse> {
  // Usar functions.invoke para que Supabase adjunte automáticamente
  // el token del usuario logueado (no la anon key)
  const { data, error } = await supabase.functions.invoke('sugerencia-ia', {
    body: {
      nombre: clientName,
      vehiculo,
      temperatura,
      contactos: contactCount,
      historial,
    },
  })

  if (error) {
    throw error
  }

  const limpiar = (t: string) => (t || '').replace(/[#*_`]/g, '').trim()

  return {
    sugerencia: limpiar(data?.sugerencia || ''),
    mensaje: limpiar(data?.mensaje || ''),
  }
}
