import { getColors } from 'react-native-image-colors'

// Extrae un color representativo del auto (prioriza vibrante) y devuelve fondo pastel + texto oscuro
export async function extraerColorDeImagen(url: string): Promise<{ fondo: string; texto: string }> {
  const fallback = { fondo: '#E1F5EE', texto: '#04342C' }
  try {
    const result = await getColors(url, {
      fallback: '#9CA3AF',
      cache: true,
      key: url,
    })

    let base = '#9CA3AF'

    if (result.platform === 'android') {
      // Prioridad: vibrante > muted > dominante. El vibrante suele ser el color del auto,
      // no del fondo (cielo/piso gris), que cae en dominante.
      base = elegirMasSaturado([
        result.vibrant,
        result.darkVibrant,
        result.lightVibrant,
        result.muted,
        result.dominant,
      ])
    } else if (result.platform === 'ios') {
      base = elegirMasSaturado([
        result.primary,
        result.secondary,
        result.detail,
        result.background,
      ])
    }

    return derivarColores(base)
  } catch (e) {
    return fallback
  }
}

// De una lista de colores, elige el más saturado (más "vivo"), ignorando grises
function elegirMasSaturado(colores: (string | undefined)[]): string {
  let mejor = '#9CA3AF'
  let mejorSat = -1

  for (const c of colores) {
    if (!c) continue
    const sat = saturacion(c)
    if (sat > mejorSat) {
      mejorSat = sat
      mejor = c
    }
  }
  return mejor
}

// Calcula la saturación de un color (0 = gris, 1 = puro)
function saturacion(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  if (max === 0) return 0
  return (max - min) / max
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  if (clean.length < 6) return { r: 156, g: 163, b: 175 }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

// De un color base saca una versión pastel (fondo) y una oscura (texto)
function derivarColores(hex: string): { fondo: string; texto: string } {
  const { r, g, b } = hexToRgb(hex)

  // Fondo: mezcla hacia el blanco (78%)
  const fondoR = Math.round(r + (255 - r) * 0.78)
  const fondoG = Math.round(g + (255 - g) * 0.78)
  const fondoB = Math.round(b + (255 - b) * 0.78)

  // Texto: oscurece (38%)
  const textoR = Math.round(r * 0.38)
  const textoG = Math.round(g * 0.38)
  const textoB = Math.round(b * 0.38)

  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return {
    fondo: `#${toHex(fondoR)}${toHex(fondoG)}${toHex(fondoB)}`,
    texto: `#${toHex(textoR)}${toHex(textoG)}${toHex(textoB)}`,
  }
}
