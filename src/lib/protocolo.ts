// Calcula la próxima fecha de contacto según el protocolo
export function calcularProximoContacto(
  contactCount: number,
  temperature: string,
  lastContactAt: string | null
): Date {
  const base = lastContactAt ? new Date(lastContactAt) : new Date()
  const next = new Date(base)

  if (temperature === 'hot') {
    if (contactCount === 0) next.setDate(next.getDate() + 0)  // hoy mismo
    else if (contactCount === 1) next.setDate(next.getDate() + 1)  // día siguiente
    else if (contactCount === 2) next.setDate(next.getDate() + 1)  // día siguiente
    else next.setDate(next.getDate() + 3)  // cada 3 días
  } else if (temperature === 'warm') {
    if (contactCount < 3) next.setDate(next.getDate() + 3)
    else next.setDate(next.getDate() + 7)  // semanal
  } else {
    // cold
    next.setDate(next.getDate() + 15)  // quincenal
  }

  return next
}

// Devuelve un texto legible de cuándo toca contactar
export function proximoContactoTexto(
  contactCount: number,
  temperature: string,
  lastContactAt: string | null
): string {
  const next = calcularProximoContacto(contactCount, temperature, lastContactAt)
  const ahora = new Date()
  const diffMs = next.getTime() - ahora.getTime()
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias <= 0) return 'Hoy toca contactar'
  if (diffDias === 1) return 'Mañana'
  if (diffDias <= 7) return `En ${diffDias} días`
  if (diffDias <= 14) return 'En una semana'
  return `En ${diffDias} días`
}

// Determina si un cliente necesita contacto hoy
export function necesitaContactoHoy(
  contactCount: number,
  temperature: string,
  lastContactAt: string | null
): boolean {
  const next = calcularProximoContacto(contactCount, temperature, lastContactAt)
  const ahora = new Date()
  return next <= ahora
}