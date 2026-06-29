import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useEffect } from 'react'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'

const tempColor = (t: string) => t === 'hot' ? '#FF4444' : t === 'warm' ? '#F0A020' : '#4A8AE8'
const tempDim   = (t: string) => t === 'hot' ? '#2A0808' : t === 'warm' ? '#2A1A00' : '#0A1428'

const GRUPOS = [
  { key: 'hot',  label: '🔴 Hot',      color: '#FF4444' },
  { key: 'warm', label: '🟡 Warm',     color: '#F0A020' },
  { key: 'cold', label: '🔵 Cold',     color: '#4A8AE8' },
  { key: 'sold', label: '✅ Cerrados', color: '#22C97A' },
]

export default function PipelineScreen() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [activo, setActivo]   = useState('hot')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const data = await getClients()
      setClients(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtrados = activo === 'sold'
    ? clients.filter(c => c.sold)
    : clients.filter(c => c.temperature === activo && !c.sold)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Pipeline</Text>
        <Text style={styles.sub}>{clients.filter(c => !c.sold).length} activos · {clients.filter(c => c.sold).length} cerrados</Text>

        {/* Tabs de temperatura */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabs}>
            {GRUPOS.map(g => {
              const count = g.key === 'sold'
                ? clients.filter(c => c.sold).length
                : clients.filter(c => c.temperature === g.key && !c.sold).length
              const isActive = activo === g.key
              return (
                <TouchableOpacity
                  key={g.key}
                  onPress={() => setActivo(g.key)}
                  style={[styles.tab, { backgroundColor: isActive ? g.color : tempDim(g.key === 'sold' ? 'cold' : g.key), borderColor: g.color }]}
                >
                  <Text style={[styles.tabText, { color: isActive ? '#fff' : g.color }]}>
                    {g.label}
                  </Text>
                  <View style={[styles.tabCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#252535' }]}>
                    <Text style={[styles.tabCountText, { color: isActive ? '#fff' : '#55556A' }]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>

        {/* Cards */}
        {filtrados.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin clientes en esta categoría</Text>
          </View>
        ) : filtrados.map(c => (
          <View key={c.id} style={[styles.card, { borderColor: tempColor(c.temperature) + '44' }]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: '#7B3FE4' }]}>
                <Text style={styles.avatarText}>{c.name.slice(0,2).toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{c.name}</Text>
                <Text style={styles.cardVehicle}>{c.vehicle_interest || 'Sin vehículo'}</Text>
                <Text style={styles.cardBudget}>{c.budget || ''}</Text>
              </View>
              <View style={styles.actions}>
                <Text style={styles.actionBtn}>📞</Text>
                <Text style={styles.actionBtn}>💬</Text>
              </View>
            </View>
            {c.docs_received && (
              <Text style={styles.docsTag}>📄 Documentos recibidos</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0A0A0F' },
  content:        { padding: 20, paddingTop: 60, paddingBottom: 100 },
  titulo:         { color: '#EEEEF5', fontSize: 22, fontWeight: '800' },
  sub:            { color: '#55556A', fontSize: 12, marginTop: 4, marginBottom: 16 },
  tabsScroll:     { marginBottom: 16 },
  tabs:           { flexDirection: 'row', gap: 8 },
  tab:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabText:        { fontSize: 12, fontWeight: '700' },
  tabCount:       { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountText:   { fontSize: 11, fontWeight: '700' },
  card:           { backgroundColor: '#1A1A24', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
  cardRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:         { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#fff', fontSize: 13, fontWeight: '800' },
  cardInfo:       { flex: 1 },
  cardName:       { color: '#EEEEF5', fontSize: 14, fontWeight: '700' },
  cardVehicle:    { color: '#AAAABF', fontSize: 12, marginTop: 2 },
  cardBudget:     { color: '#F0A020', fontSize: 11, marginTop: 2, fontWeight: '600' },
  actions:        { gap: 8 },
  actionBtn:      { fontSize: 20 },
  docsTag:        { color: '#22C97A', fontSize: 11, fontWeight: '700', marginTop: 8 },
  empty:          { alignItems: 'center', marginTop: 60 },
  emptyText:      { color: '#55556A', fontSize: 14 },
})