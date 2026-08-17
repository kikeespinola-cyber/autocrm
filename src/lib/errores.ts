// Convierte cualquier error en un mensaje claro y amigable para el vendedor

export function mensajeError(error: any): string {
  if (!error) return 'Ocurrió un error inesperado.'

  const msg = (error.message || error.toString() || '').toLowerCase()

  // Errores de red / conexión
  if (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('connection') ||
    msg.includes('econnrefused') ||
    msg.includes('unable to resolve host')
  ) {
    return 'Sin conexión. Revisá tu internet e intentá de nuevo.'
  }

  // Sesión expirada / no autorizado
  if (
    msg.includes('jwt') ||
    msg.includes('unauthorized') ||
    msg.includes('not authenticated') ||
    msg.includes('invalid token') ||
    error.status === 401
  ) {
    return 'Tu sesión expiró. Volvé a iniciar sesión.'
  }

  // Permisos / RLS
  if (
    msg.includes('permission') ||
    msg.includes('policy') ||
    msg.includes('row-level security') ||
    error.status === 403
  ) {
    return 'No tenés permiso para esta acción.'
  }

  // Registro duplicado
  if (msg.includes('duplicate') || msg.includes('already exists') || error.code === '23505') {
    return 'Este registro ya existe.'
  }

  // Servidor caído
  if (error.status >= 500) {
    return 'El servidor no responde. Intentá en unos minutos.'
  }

  // Fallback: mensaje original si es corto y legible, si no genérico
  if (error.message && error.message.length < 100) {
    return error.message
  }

  return 'Ocurrió un error. Intentá de nuevo.'
}

// Detecta si un error es específicamente de conexión (para mostrar UI de "sin internet")
export function esErrorDeRed(error: any): boolean {
  if (!error) return false
  const msg = (error.message || error.toString() || '').toLowerCase()
  return (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('connection') ||
    msg.includes('econnrefused') ||
    msg.includes('unable to resolve host')
  )
}
