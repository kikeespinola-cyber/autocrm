// Lee los tokens que Supabase manda de vuelta en el deep link del mail de recuperación.
//
// El cliente usa el flow implícito (default de @supabase/auth-js), así que el link del
// mail pasa por /auth/v1/verify y termina redirigiendo a:
//   vendix://restablecer-password#access_token=...&refresh_token=...&type=recovery
//
// Los tokens vienen en el fragmento (#), no en query params: Linking.parse() no los ve,
// por eso parseamos a mano en vez de usar URLSearchParams (el polyfill de Hermes es parcial).

import { supabase } from './supabase'

export type TokensRecovery = {
  access_token: string
  refresh_token: string
}

// Los tokens del link quedan en memoria por si hay que rehacer la sesión. auth-js
// puede descartarla solo entre que abrimos la pantalla y el usuario toca Guardar:
// un getUser() que vuelve con session-missing la borra, y un refresh fallido con
// el access token ya vencido tambien. Sin esto, updateUser tira "Auth session missing".
let tokensPendientes: TokensRecovery | null = null

export function guardarTokensRecovery(tokens: TokensRecovery) {
  tokensPendientes = tokens
}

export function olvidarTokensRecovery() {
  tokensPendientes = null
}

// true si al terminar hay sesión activa: la que ya estaba, o una rehecha con los
// tokens del link. Es lo que hay que llamar antes de cualquier operación que
// necesite la sesión de recuperación, en vez de asumir que sigue viva.
export async function asegurarSesionRecovery(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return true

  if (!tokensPendientes) return false

  const { data, error } = await supabase.auth.setSession({
    access_token: tokensPendientes.access_token,
    refresh_token: tokensPendientes.refresh_token,
  })
  if (error) return false
  return !!data.session
}

function leerParams(cadena: string): Record<string, string> {
  const params: Record<string, string> = {}
  for (const par of cadena.split('&')) {
    if (!par) continue
    const corte = par.indexOf('=')
    if (corte === -1) continue
    const clave = decodeURIComponent(par.slice(0, corte))
    const valor = decodeURIComponent(par.slice(corte + 1).replace(/\+/g, ' '))
    if (clave) params[clave] = valor
  }
  return params
}

export function parsearTokensRecovery(url: string): TokensRecovery | null {
  if (!url) return null

  // Miramos el fragmento y también la query: Supabase usa el fragmento, pero algunos
  // clientes de mail reescriben el link y lo pasan a query params.
  const partes: string[] = []

  const corteHash = url.indexOf('#')
  if (corteHash !== -1) partes.push(url.slice(corteHash + 1))

  const sinHash = corteHash !== -1 ? url.slice(0, corteHash) : url
  const corteQuery = sinHash.indexOf('?')
  if (corteQuery !== -1) partes.push(sinHash.slice(corteQuery + 1))

  for (const parte of partes) {
    const params = leerParams(parte)
    if (params.type !== 'recovery') continue
    if (!params.access_token || !params.refresh_token) continue
    return { access_token: params.access_token, refresh_token: params.refresh_token }
  }

  return null
}
