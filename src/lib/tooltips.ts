import AsyncStorage from '@react-native-async-storage/async-storage'

export async function tooltipVisto(key: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(`tooltip_${key}`)
    return val === 'true'
  } catch {
    return false
  }
}

export async function marcarTooltipVisto(key: string) {
  try {
    await AsyncStorage.setItem(`tooltip_${key}`, 'true')
  } catch {}
}