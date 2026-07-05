import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

interface Usuario {
  user_id: string
  email: string
  status: string
  current_period_end: string
  is_admin: boolean
  onboarding_completado: boolean
  nombre_vendedor: string | null
  concesionaria: string | null
  created_at: string
}

export default function AdminScreen() {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([])
  const [loading, setLoading]     = useState(true)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [checkeando, setCheckeando] = useState(true)

  useEffect(() => { verificar() }, [])

  async function verificar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCheckeando(false); return }

    const { data } = await supabase
      .from('subscriptions')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (data?.is_admin) {
      setIsAdmin(true)
      await cargarUsuarios()
    }
    setCheckeando(false)
  }

  async function cargarUsuarios() {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('obtener_usuarios_con_email')
      if (error) throw error
      if (data) setUsuarios(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function activar30Dias(userId: string) {
    await supabase.from('subscriptions').update({
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('user_id', userId)
    await cargarUsuarios()
  }

  async function desactivar(userId: string) {
    const ok = typeof window !== 'undefined' ? window.confirm('¿Desactivar este usuario?') : false
    if (!ok) return
    await supabase.from('subscriptions').update({
      status: 'inactive',
      current_period_end: new Date().toISOString(),
    }).eq('user_id', userId)
    await cargarUsuarios()
  }

  async function crearSuscripcion(userId: string) {
    await supabase.from('subscriptions').insert({
      user_id: userId,
      status: 'trial',
      plan: 'individual',
      current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      is_admin: false,
      onboarding_completado: false,
    })
    await cargarUsuarios()
  }

  if (checkeando) return (
    <View style={styles.loading}>
      <Text style={{ color: T.accent }}>Verificando acceso...</Text>
    </View>
  )

  if (!isAdmin) return (
    <View style={styles.loading}>
      <Text style={styles.titulo}>Acceso restringido</Text>
      <Text style={styles.sub}>Esta sección es solo para administradores.</Text>
    </View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Panel de administrador</Text>
      <Text style={styles.sub}>{usuarios.length} usuarios registrados</Text>

      {loading ? (
        <Text style={{ color: T.muted, textAlign: 'center', marginTop: 40 }}>Cargando usuarios...</Text>
      ) : usuarios.map(u => (
        <View key={u.user_id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.email}>{u.email}</Text>
              {u.nombre_vendedor && <Text style={styles.nombre}>{u.nombre_vendedor}</Text>}
              {u.concesionaria && <Text style={styles.concesionaria}>🏢 {u.concesionaria}</Text>}
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor:
                u.status === 'active' ? T.greenDim :
                u.status === 'trial'  ? T.accentDim :
                T.redDim
            }]}>
              <Text style={[styles.statusText, {
                color:
                  u.status === 'active' ? T.green :
                  u.status === 'trial'  ? T.accentText :
                  T.red
              }]}>{u.status}</Text>
            </View>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.infoText}>
              Vence: {u.current_period_end ? new Date(u.current_period_end).toLocaleDateString('es-PY') : '—'}
            </Text>
            <Text style={styles.infoText}>
              Onboarding: {u.onboarding_completado ? '✅' : '⏳'}
            </Text>
          </View>

          <View style={styles.btns}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: T.greenDim }]}
              onPress={() => activar30Dias(u.user_id)}
            >
              <Text style={[styles.btnText, { color: T.green }]}>+30 días</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: T.redDim }]}
              onPress={() => desactivar(u.user_id)}
            >
              <Text style={[styles.btnText, { color: T.red }]}>Desactivar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Usuarios sin suscripción */}
      <TouchableOpacity style={styles.refreshBtn} onPress={async () => {
        // Buscar usuarios sin suscripción y crearles una
        const { data: sinSub } = await supabase.rpc('usuarios_sin_suscripcion')
        if (sinSub && sinSub.length > 0) {
          for (const u of sinSub) {
            await crearSuscripcion(u.id)
          }
          Alert.alert('Listo', `Se crearon ${sinSub.length} suscripciones pendientes`)
        } else {
          Alert.alert('Todo ok', 'No hay usuarios sin suscripción')
        }
        await cargarUsuarios()
      }}>
        <Text style={styles.refreshBtnText}>🔄 Sincronizar usuarios sin suscripción</Text>
      </TouchableOpacity>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: T.bg },
  content:      { padding: 20, paddingTop: 60, paddingBottom: 100 },
  loading:      { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', gap: 8 },
  titulo:       { color: T.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sub:          { color: T.muted, fontSize: 12, marginTop: 4, marginBottom: 24, fontWeight: '500' },
  card:         { backgroundColor: T.white, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: T.border },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  email:        { color: T.text, fontSize: 13, fontWeight: '700' },
  nombre:       { color: T.textSub, fontSize: 12, marginTop: 2 },
  concesionaria:{ color: T.muted, fontSize: 11, marginTop: 2 },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:   { fontSize: 11, fontWeight: '700' },
  cardInfo:     { flexDirection: 'row', gap: 16, marginBottom: 12 },
  infoText:     { color: T.muted, fontSize: 11 },
  btns:         { flexDirection: 'row', gap: 8 },
  btn:          { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  btnText:      { fontSize: 12, fontWeight: '700' },
  refreshBtn:   { backgroundColor: T.white, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 0.5, borderColor: T.accent + '44' },
  refreshBtnText: { color: T.accentText, fontSize: 13, fontWeight: '700' },
})