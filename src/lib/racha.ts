import { supabase } from './supabase'

export async function actualizarRacha(userId: string): Promise<number> {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('racha_dias, ultimo_acceso')
      .eq('user_id', userId)
      .single()

    if (!sub) return 0

    const hoy       = new Date().toISOString().split('T')[0]
    const ayer      = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const ultimo    = sub.ultimo_acceso
    let racha       = sub.racha_dias || 0

    if (ultimo === hoy) return racha // ya se actualizó hoy
    if (ultimo === ayer) racha += 1  // día consecutivo
    else racha = 1                   // se rompió la racha

    await supabase.from('subscriptions').update({
      racha_dias:    racha,
      ultimo_acceso: hoy,
    }).eq('user_id', userId)

    return racha
  } catch {
    return 0
  }
}

export function calcularInsignias(
  racha: number,
  ventas: number,
  totalClientes: number
): { id: string; emoji: string; label: string; descripcion: string; obtenida: boolean }[] {
  return [
    {
      id: 'primera_venta',
      emoji: '🏆',
      label: 'Primera venta',
      descripcion: 'Cerraste tu primera venta',
      obtenida: ventas >= 1,
    },
    {
      id: 'cinco_ventas',
      emoji: '🌟',
      label: 'Vendedor estrella',
      descripcion: '5 ventas cerradas',
      obtenida: ventas >= 5,
    },
    {
      id: 'diez_ventas',
      emoji: '💎',
      label: 'Top vendedor',
      descripcion: '10 ventas cerradas',
      obtenida: ventas >= 10,
    },
    {
      id: 'racha_7',
      emoji: '🔥',
      label: 'En llamas',
      descripcion: '7 días consecutivos usando Vendix',
      obtenida: racha >= 7,
    },
    {
      id: 'racha_30',
      emoji: '⚡',
      label: 'Imparable',
      descripcion: '30 días consecutivos usando Vendix',
      obtenida: racha >= 30,
    },
    {
      id: 'diez_clientes',
      emoji: '👥',
      label: 'Red en crecimiento',
      descripcion: '10 clientes en tu pipeline',
      obtenida: totalClientes >= 10,
    },
    {
      id: 'cincuenta_clientes',
      emoji: '🚀',
      label: 'Pipeline poderoso',
      descripcion: '50 clientes en tu pipeline',
      obtenida: totalClientes >= 50,
    },
  ]
}