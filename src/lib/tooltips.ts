import { supabase } from './supabase'

export async function tooltipVisto(key: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase
      .from('subscriptions')
      .select('tooltips_vistos')
      .eq('user_id', user.id)
      .single()

    if (!data) return false
    return (data.tooltips_vistos || []).includes(key)
  } catch {
    return false
  }
}

export async function marcarTooltipVisto(key: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('subscriptions')
      .select('tooltips_vistos')
      .eq('user_id', user.id)
      .single()

    const actuales = data?.tooltips_vistos || []
    if (actuales.includes(key)) return

    await supabase
      .from('subscriptions')
      .update({ tooltips_vistos: [...actuales, key] })
      .eq('user_id', user.id)
  } catch {
    // silencioso
  }
}