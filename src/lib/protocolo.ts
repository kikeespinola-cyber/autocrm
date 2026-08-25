import { Client } from './types'

// Datos que mira el protocolo. Se pasa el cliente entero (o un subconjunto con
// estos campos) en vez de argumentos sueltos: si mañana se suma otra columna a
// la regla, la firma no cambia y ningún call site queda ignorándola en silencio.
export type DatosProtocolo = Pick<
  Client,
  'contact_count' | 'temperature' | 'last_contact_at' | 'next_contact_at'
>

// ¿El vendedor fijó una fecha a mano para este cliente?
// La app sólo escribe next_contact_at cuando se fija la fecha desde la ficha
// (la regla automática no se persiste nunca), así que con que no sea null alcanza.
export function tieneFechaFijada(c: DatosProtocolo): boolean {
  return !!c.next_contact_at
}

// Calcula la próxima fecha de contacto según el protocolo.
// Si hay fecha fijada a mano, esa gana y la regla de temperatura no corre: el
// cliente que pidió "llamame en mes y medio" no entra en ninguna categoría.
export function calcularProximoContacto(c: DatosProtocolo): Date {
  if (c.next_contact_at) return new Date(c.next_contact_at)

  const base = c.last_contact_at ? new Date(c.last_contact_at) : new Date()
  const next = new Date(base)

  if (c.temperature === 'hot') {
    if (c.contact_count === 0) next.setDate(next.getDate() + 0)  // hoy mismo
    else if (c.contact_count === 1) next.setDate(next.getDate() + 1)  // día siguiente
    else if (c.contact_count === 2) next.setDate(next.getDate() + 1)  // día siguiente
    else next.setDate(next.getDate() + 3)  // cada 3 días
  } else if (c.temperature === 'warm') {
    if (c.contact_count < 3) next.setDate(next.getDate() + 3)
    else next.setDate(next.getDate() + 7)  // semanal
  } else {
    // cold
    next.setDate(next.getDate() + 15)  // quincenal
  }

  return next
}

// "12 oct" — formato corto para las cards
export function fechaCorta(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })
}

// Devuelve un texto legible de cuándo toca contactar
export function proximoContactoTexto(c: DatosProtocolo): string {
  const next = calcularProximoContacto(c)
  const ahora = new Date()
  const diffMs = next.getTime() - ahora.getTime()
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  // La fecha fijada se lee distinto de la automática: el vendedor tiene que ver
  // de un vistazo que ese cliente no está siguiendo la regla de temperatura.
  if (tieneFechaFijada(c)) {
    // Ojo con el -0: la fecha de hoy ya pasó por milisegundos (se guarda a
    // medianoche), así que ceil() la deja en -0 y no en negativo.
    if (diffDias < 0) return `Fijado: se pasó el ${fechaCorta(next)}`
    if (diffDias === 0) return 'Fijado para hoy'
    if (diffDias === 1) return 'Fijado: mañana'
    return `Fijado: ${fechaCorta(next)}`
  }

  if (diffDias <= 0) return 'Hoy toca contactar'
  if (diffDias === 1) return 'Mañana'
  if (diffDias <= 7) return `En ${diffDias} días`
  if (diffDias <= 14) return 'En una semana'
  return `En ${diffDias} días`
}

// Determina si un cliente necesita contacto hoy
export function necesitaContactoHoy(c: DatosProtocolo): boolean {
  return calcularProximoContacto(c) <= new Date()
}

// --- Fijar la fecha a mano --------------------------------------------------

// Medianoche local del día elegido. Guardar medianoche UTC haría que en Paraguay
// (UTC-3) el instante caiga el día anterior a las 21hs y el cliente aparezca un
// día antes de lo prometido.
function medianocheLocal(anio: number, mes: number, dia: number): Date {
  return new Date(anio, mes - 1, dia, 0, 0, 0, 0)
}

// Medianoche de hoy, para comparar fechas por día y no por hora.
function hoyMedianoche(): Date {
  const h = new Date()
  return medianocheLocal(h.getFullYear(), h.getMonth() + 1, h.getDate())
}

// Fecha fijada dentro de N días, lista para guardar en next_contact_at.
export function fechaFijadaEnDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return medianocheLocal(d.getFullYear(), d.getMonth() + 1, d.getDate()).toISOString()
}

// Ídem en meses. setMonth() resuelve solo los desbordes (31/1 + 1 mes = 3/3).
export function fechaFijadaEnMeses(meses: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + meses)
  return medianocheLocal(d.getFullYear(), d.getMonth() + 1, d.getDate()).toISOString()
}

// ¿La fecha cae antes de hoy? Sirve para rebotar fechas pasadas en la UI.
export function esAnteriorAHoy(iso: string): boolean {
  return new Date(iso) < hoyMedianoche()
}

// Parsea lo que escriba el vendedor ("12/10/2026", "12/10", "12-10-26") y
// devuelve el ISO listo para guardar, o null si no es una fecha válida.
export function parsearFechaFijada(texto: string): string | null {
  const partes = texto.trim().split(/[/\-.]/).filter(p => p !== '')
  if (partes.length < 2) return null

  const dia = parseInt(partes[0], 10)
  const mes = parseInt(partes[1], 10)
  let anio = partes[2] ? parseInt(partes[2], 10) : new Date().getFullYear()
  if (anio < 100) anio += 2000

  if (!dia || !mes || !anio) return null
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null

  let d = medianocheLocal(anio, mes, dia)

  // Rebota fechas inexistentes: new Date(2026, 1, 31) se corrige solo al 3 de marzo.
  if (d.getMonth() !== mes - 1 || d.getDate() !== dia) return null

  // Sin año escrito, "12/10" tecleado en diciembre se entiende como el año que viene.
  if (!partes[2] && d < hoyMedianoche()) {
    d = medianocheLocal(anio + 1, mes, dia)
  }

  return d.toISOString()
}
