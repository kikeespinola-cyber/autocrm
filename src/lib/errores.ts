export function mensajeError(error: any): string {
  if (!error) return 'Ocurrió un error inesperado.'

  const msg = error.message || error.toString()

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Sin conexión a internet. Revisá tu wifi o datos móviles.'
  }
  if (msg.includes('JWT') || msg.includes('expired')) {
    return 'Tu sesión expiró. Cerrá sesión y volvé a entrar.'
  }
  if (msg.includes('duplicate key')) {
    return 'Ya existe un registro con esos datos.'
  }
  if (msg.includes('violates foreign key')) {
    return 'No se pudo completar la acción. Intentá de nuevo.'
  }

  return 'Algo salió mal. Intentá de nuevo en unos segundos.'
}