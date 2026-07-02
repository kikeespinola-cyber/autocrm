import Anthropic from 'npm:@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const body = await req.json()
    const { nombre, vehiculo, temperatura, contactos, historial, promptPersonalizado } = body

    let prompt = promptPersonalizado

    if (!prompt) {
      const historialTexto = historial?.length > 0
        ? historial.slice(0, 5).map((h: any) => `- ${h.type}: ${h.content}`).join('\n')
        : 'Sin historial previo'

      prompt = `Sos un asistente experto en ventas de vehículos en Paraguay.

Cliente: ${nombre}
Vehículo de interés: ${vehiculo || 'No especificado'}
Temperatura del lead: ${temperatura}
Número de contactos previos: ${contactos}
Historial reciente:
${historialTexto}

Basándote en esta información, generá:
1. Una sugerencia estratégica breve (máximo 2 oraciones) sobre cómo abordar al cliente
2. Un mensaje de WhatsApp natural y personalizado listo para enviar

Respondé en formato JSON exacto:
{
  "sugerencia": "tu sugerencia estratégica aquí",
  "mensaje": "el mensaje de WhatsApp aquí"
}`
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''

    // Si es prompt personalizado, devolver el texto directo
    if (promptPersonalizado) {
      return new Response(
        JSON.stringify({ sugerencia: content, mensaje: content }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Si es sugerencia normal, parsear JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { sugerencia: content, mensaje: '' }

    return new Response(
      JSON.stringify(parsed),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})