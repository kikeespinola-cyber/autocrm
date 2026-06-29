const SUPABASE_URL = 'https://axkwixgbglrpkqqlgbfa.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_pkAdPGNvjSMDoZ8BQgn-2Q_mpZUlnp_'

export async function generarSugerencia(
  clientName: string,
  vehiculo: string | null,
  temperatura: string,
  contactCount: number,
  historial: { type: string; content: string | null; created_at: string }[]
): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sugerencia-ia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      clientName,
      vehiculo,
      temperatura,
      contactCount,
      historial,
    }),
  })

  const data = await response.json()
  const texto = data.sugerencia || 'No se pudo generar sugerencia.'
  return texto.replace(/[#*_`]/g, '').replace(/\n+/g, ' ').trim()
}