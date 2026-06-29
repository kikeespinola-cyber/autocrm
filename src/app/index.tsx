import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useEffect, useState } from 'react'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'

const tempColor = (t: string) => t === 'hot' ? '#FF4444' : t === 'warm' ? '#F0A020' : '#4A8AE8'
const tempLabel = (t: string) => t === 'hot' ? '🔴 Hot' : t === 'warm' ? '🟡 Warm' : '🔵 Cold'
const tempDim = (t: string) => t === 'hot' ? '#2A0808' : t === 'warm' ? '#2A1A00' : '#0A1428'

export default function HoyScreen() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarClientes()
  }, [])

  async function cargarClientes() {
    try {
      const data = await getClients()
      setClients(data)
    } catch (e) {
      console.error('Error cargando clientes:', e)
    } finally {
      setLoading(false)
    }
  }

  const hot  = clients.filter(c => c.temperature === 'hot'  && !c.sold)
  const warm = clients.filter(c => c.temperature === 'warm' && !c.sold)
  const cerrados = clients.filter(c => c.sold)
  const urgentes = clients.filter(c => c.temperature === 'hot' && !c.sold)
  const masTarde = clients.filter(c => c.temperature === 'warm' && !c.sold)

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color='#F0A020' size='large' />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.fecha}>Lunes, 29 de junio</Text>
      <Text style={styles.titulo}>Tu día · {urgentes.length + masTarde.length} acciones</Text>

      <View style={styles.statsRow}>
        {[
          { num: hot.length + warm.length, label: 'Activos',  color: '#F0A020' },
          { num: cerrados.length,          label: 'Cerrados', color: '#22C97A' },
          { num: urgentes.length,          label: 'Urgentes', color: '#FF4444' },
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
            <View key={c.id} style={[styles.card, { borderColor: '#FF444433' }]}>
              <View style={styles.cardRow}>
                <View style={[styles.dot, { backgroundColor: '#FF4444' }]} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.cardVehicle}>{c.vehicle_interest}</Text>
                </View>
                <Text style={[styles.badge, { color: tempColor(c.temperature), backgroundColor: tempDim(c.temperature) }]}>
                  {tempLabel(c.temperature)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {masTarde.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>MÁS TARDE HOY</Text>
          {masTarde.map(c => (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={[styles.dot, { backgroundColor: tempColor(c.temperature) }]} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.cardVehicle}>{c.vehicle_interest}</Text>
                </View>
                <Text style={[styles.badge, { color: tempColor(c.temperature), backgroundColor: tempDim(c.temperature) }]}>
                  {tempLabel(c.temperature)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {clients.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay clientes cargados todavía</Text>
          <Text style={styles.emptySubText}>Andá a Clientes para agregar el primero</Text>
        </View>
      )}

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0A0A0F' },
  content:      { padding: 20, paddingTop: 60 },
  loading:      { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' },
  fecha:        { color: '#55556A', fontSize: 12, letterSpacing: 1 },
  titulo:       { color: '#EEEEF5', fontSize: 22, fontWeight: '800', marginTop: 4, marginBottom: 20 },
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard:     { flex: 1, backgroundColor: '#1A1A24', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#252535' },
  statNum:      { fontSize: 28, fontWeight: '800' },
  statLabel:    { color: '#55556A', fontSize: 11, marginTop: 2 },
  sectionLabel: { color: '#55556A', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  card:         { backgroundColor: '#1A1A24', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#252535' },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  cardInfo:     { flex: 1 },
  cardName:     { color: '#EEEEF5', fontSize: 14, fontWeight: '700' },
  cardVehicle:  { color: '#AAAABF', fontSize: 12, marginTop: 2 },
  badge:        { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  empty:        { alignItems: 'center', marginTop: 60 },
  emptyText:    { color: '#EEEEF5', fontSize: 16, fontWeight: '700' },
  emptySubText: { color: '#55556A', fontSize: 13, marginTop: 8 },
})