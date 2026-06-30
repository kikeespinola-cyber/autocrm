import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

interface UsuarioConSub {
  user_id: string
  email: string
  status: string
  plan: string
  current_period_end: string
  is_admin: boolean
}

export default function AdminScreen() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<UsuarioConSub[]>([])
  const [esAdmin, setEsAdmin]   = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { verificarAdmin() }, [])

  async function verificarAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('is_admin')
      .eq('user_id', user?.id)
      .single()

    if (sub?.is_admin) {
      setEsAdmin(true)
      cargarUsuarios()
    } else {
      setLoading(false)
    }
  }

  async function cargarUsuarios() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id, status, plan, current_period_end, is_admin')
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })

  if (data) {
    const conEmails = data.map((s) => ({
      ...s,
      email: s.user_id ? s.user_id.slice(0, 8) + '...' : 'sin usuario'
    }))
    setUsuarios(conEmails as UsuarioConSub[])
  }
  setLoading(false)
}

  async function cambiarEstado(userId: string, nuevoEstado: string) {
    const dias = nuevoEstado === 'active' ? 30 : 0
    const nuevaFecha = new Date()
    nuevaFecha.setDate(nuevaFecha.getDate() + dias)

    await supabase
      .from('subscriptions')
      .update({
        status: nuevoEstado,
        current_period_end: nuevoEstado === 'active' ? nuevaFecha.toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (typeof window !== 'undefined') {
      window.alert(nuevoEstado === 'active' ? '✅ Usuario activado por 30 días' : '🚫 Usuario desactivado')
    }
    cargarUsuarios()
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: T.accent }}>Cargando...</Text>
      </View>
    )
  }

  if (!esAdmin) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: T.text, fontSize: 16, fontWeight: '700' }}>Acceso restringido</Text>
        <Text style={{ color: T.muted, fontSize: 13, marginTop: 8 }}>Esta sección es solo para administradores.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Panel de administrador</Text>
      <Text style={styles.sub}>{usuarios.length} usuarios registrados</Text>

      {usuarios.map(u => {
        const activo = u.status === 'active' && new Date(u.current_period_end) > new Date()
        const trial  = u.status === 'trial'
        return (
          <View key={u.user_id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.email}>{u.email}</Text>
                <Text style={styles.plan}>{u.plan} · {u.is_admin ? '👑 Admin' : 'Vendedor'}</Text>
                <Text style={styles.fecha}>Vence: {new Date(u.current_period_end).toLocaleDateString('es-PY')}</Text>
              </View>
              <View style={[styles.badge, {
                backgroundColor: activo ? T.greenDim : trial ? T.warmDim : T.redDim
              }]}>
                <Text style={[styles.badgeText, {
                  color: activo ? T.green : trial ? T.warmText : T.red
                }]}>
                  {activo ? 'Activo' : trial ? 'Trial' : 'Inactivo'}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btnAccion, { backgroundColor: T.greenDim }]} onPress={() => cambiarEstado(u.user_id, 'active')}>
                <Text style={[styles.btnAccionText, { color: T.green }]}>✅ Activar 30 días</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAccion, { backgroundColor: T.redDim }]} onPress={() => cambiarEstado(u.user_id, 'inactive')}>
                <Text style={[styles.btnAccionText, { color: T.red }]}>🚫 Desactivar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: T.bg },
  loading:      { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  content:      { padding: 20, paddingTop: 20, paddingBottom: 60 },
  titulo:       { color: T.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sub:          { color: T.muted, fontSize: 12, marginTop: 4, marginBottom: 20, fontWeight: '500' },
  card:         { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: T.border },
  cardRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  email:        { color: T.text, fontSize: 14, fontWeight: '700' },
  plan:         { color: T.textSub, fontSize: 12, marginTop: 2 },
  fecha:        { color: T.muted, fontSize: 11, marginTop: 2 },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  actions:      { flexDirection: 'row', gap: 8, marginTop: 12 },
  btnAccion:    { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  btnAccionText:{ fontSize: 11, fontWeight: '700' },
})