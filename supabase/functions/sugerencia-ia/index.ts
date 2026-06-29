
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { clientName, vehiculo, temperatura, contactCount, historial } = await req.json()

    const historialTexto = historial.length === 0
      ? 'Sin contactos previos.'
      : historial.map((h: any) => `- [${h.type}] ${h.content || ''}`).join('\n')

    const prompt = `Sos un asistente experto en ventas de vehículos en Paraguay.

Cliente: ${clientName}
Vehículo de interés: ${vehiculo || 'no especificado'}
Temperatura: ${temperatura}
Contactos realizados: ${contactCount}

Historial:
${historialTexto}

Escribí UNA sugerencia concreta y breve (máximo 2 oraciones) sobre qué decirle al cliente en el próximo contacto. Sé específico y directo.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const sugerencia = data.content?.[0]?.text || 'No se pudo generar sugerencia.'

    return new Response(JSON.stringify({ sugerencia }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})