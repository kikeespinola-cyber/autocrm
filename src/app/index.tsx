import { mensajeError } from '../lib/errores'
import { pedirPermisos, programarRecordatorioDiario } from '../lib/notificaciones'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'
import { necesitaContactoHoy, proximoContactoTexto } from '../lib/protocolo'
import { T, tempColor, tempDim, tempTextColor, tempLabel } from '../lib/theme'

export default function HoyScreen() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargar()
    pedirPermisos().then(granted => {
      if (granted) programarRecordatorioDiario()
    })
  }, [])

  async function cargar() {
    try {
      const data = await getClients()
      setClients(data)
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setLoading(false)
    }
  }

  const activos  = clients.filter(c => !c.sold)
  const cerrados = clients.filter(c => c.sold)
  const urgentes = activos.filter(c =>
    necesitaContactoHoy(c.contact_count, c.temperature, c.last_contact_at) && c.temperature === 'hot'
  )
  const masTarde = activos.filter(c =>
    necesitaContactoHoy(c.contact_count, c.temperature, c.last_contact_at) && c.temperature !== 'hot'
  )
  const proximos = activos.filter(c =>
    !necesitaContactoHoy(c.contact_count, c.temperature, c.last_contact_at)
  )

if (error) {
    return (
      <View style={styles.loading}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ color: T.text, fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 30 }}>{error}</Text>
        <TouchableOpacity onPress={cargar} style={{ marginTop: 16, backgroundColor: T.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }
  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: T.accent, fontSize: 16 }}>Cargando...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.fecha}>
        {new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>
      <Text style={styles.titulo}>Tu día · {urgentes.length + masTarde.length} acciones</Text>
      <Text style={styles.eslogan}>Tus leads, más personales que nunca.</Text>

      <View style={styles.statsRow}>
        {[
          { num: activos.length,  label: 'Activos',  color: T.accent },
          { num: cerrados.length, label: 'Cerrados', color: T.green },
          { num: urgentes.length, label: 'Urgentes', color: T.red },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {urgentes.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>AHORA MISMO</Text>
          {urgentes.map(c => (
            <TouchableOpacity key={c.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: T.red }]} onPress={() => router.push(`/cliente/${c.id}`)}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: '#6366F1' }]}>
                  <Text style={styles.avatarText}>{c.name.slice(0,2).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={[styles.cardAccion, { color: T.red }]}>
                    {c.contact_count === 0 ? 'Primer contacto pendiente' : `Contacto #${c.contact_count + 1} — toca hoy`}
                  </Text>
                  <Text style={styles.cardVehicle}>{c.vehicle_interest}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: tempDim(c.temperature) }]}>
                  <Text style={[styles.badgeText, { color: tempTextColor(c.temperature) }]}>{tempLabel(c.temperature)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {masTarde.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>MÁS TARDE HOY</Text>
          {masTarde.map(c => (
            <TouchableOpacity key={c.id} style={styles.card} onPress={() => router.push(`/cliente/${c.id}`)}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: '#6366F1' }]}>
                  <Text style={styles.avatarText}>{c.name.slice(0,2).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.cardAccion}>{c.vehicle_interest}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: tempDim(c.temperature) }]}>
                  <Text style={[styles.badgeText, { color: tempTextColor(c.temperature) }]}>{tempLabel(c.temperature)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {proximos.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>PRÓXIMOS</Text>
          {proximos.map(c => (
            <TouchableOpacity key={c.id} style={styles.card} onPress={() => router.push(`/cliente/${c.id}`)}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: '#9CA3AF' }]}>
                  <Text style={styles.avatarText}>{c.name.slice(0,2).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.cardAccion}>
                    {proximoContactoTexto(c.contact_count, c.temperature, c.last_contact_at)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: tempDim(c.temperature) }]}>
                  <Text style={[styles.badgeText, { color: tempTextColor(c.temperature) }]}>{tempLabel(c.temperature)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {activos.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin clientes activos</Text>
          <Text style={styles.emptySub}>Andá a Clientes para agregar el primero</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  eslogan: { color: T.accent, fontSize: 11, fontWeight: '600', marginTop: -14, marginBottom: 20,    letterSpacing: 0.3 },
  container:    { flex: 1, backgroundColor: T.bg },
  content:      { padding: 20, paddingTop: 60, paddingBottom: 100 },
  loading:      { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  fecha:        { color: T.muted, fontSize: 12, letterSpacing: 0.5, textTransform: 'capitalize', fontWeight: '500' },
  titulo:       { color: T.text, fontSize: 24, fontWeight: '800', marginTop: 4, marginBottom: 20, letterSpacing: -0.5 },
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard:     { flex: 1, backgroundColor: T.white, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: T.border },
  statNum:      { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  statLabel:    { color: T.muted, fontSize: 11, marginTop: 3, fontWeight: '500' },
  sectionLabel: { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  card:         { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: T.border },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontSize: 13, fontWeight: '800' },
  cardInfo:     { flex: 1 },
  cardName:     { color: T.text, fontSize: 14, fontWeight: '700' },
  cardAccion:   { color: T.textSub, fontSize: 12, marginTop: 2 },
  cardVehicle:  { color: T.muted, fontSize: 11, marginTop: 2 },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  empty:        { alignItems: 'center', marginTop: 60 },
  emptyText:    { color: T.text, fontSize: 16, fontWeight: '700' },
  emptySub:     { color: T.muted, fontSize: 13, marginTop: 8 },
})