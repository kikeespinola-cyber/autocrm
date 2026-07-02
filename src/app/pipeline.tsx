import { useLocalSearchParams, useRouter } from 'expo-router'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useEffect } from 'react'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'
import { T } from '../lib/theme'

const GRUPOS_TEMP = [
  { key: 'hot',  label: '🔴 Hot',      color: '#EF4444' },
  { key: 'warm', label: '🟡 Warm',     color: '#F59E0B' },
  { key: 'cold', label: '🔵 Cold',     color: '#4A8AE8' },
  { key: 'sold', label: '✅ Cerrados', color: '#10B981' },
]

const GRUPOS_ETAPA = [
  { key: 'interesado', label: '👀 Interesado', color: '#3B82F6' },
  { key: 'evaluando',  label: '🤔 Evaluando',  color: '#F59E0B' },
  { key: 'objecion',   label: '💬 Objeción',   color: '#EF4444' },
  { key: 'documentos', label: '📄 Documentos', color: '#04dedf' },
  { key: 'cierre',     label: '🏆 Cierre',     color: '#10B981' },
]

export default function PipelineScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ filter?: string }>()
  const [clients, setClients]       = useState<Client[]>([])
  const [loading, setLoading]       = useState(true)
  const [activo, setActivo]         = useState(params.filter || 'hot')
  const [modoFiltro, setModoFiltro] = useState<'temperatura'|'etapa'>('temperatura')

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

  const filtrados = modoFiltro === 'temperatura'
    ? activo === 'sold'
      ? clients.filter(c => c.sold)
      : clients.filter(c => c.temperature === activo && !c.sold)
    : clients.filter(c => c.etapa === activo && !c.sold)

  const tempColor = (t: string) => t === 'hot' ? '#EF4444' : t === 'warm' ? '#F59E0B' : '#4A8AE8'

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Pipeline</Text>
        <Text style={styles.sub}>{clients.filter(c => !c.sold).length} activos · {clients.filter(c => c.sold).length} cerrados</Text>

        {/* Selector de modo */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[
            { key: 'temperatura', label: '🌡 Temperatura' },
            { key: 'etapa',       label: '📊 Etapa' },
          ].map(m => (
            <TouchableOpacity
              key={m.key}
              onPress={() => {
                setModoFiltro(m.key as any)
                setActivo(m.key === 'temperatura' ? 'hot' : 'interesado')
              }}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                backgroundColor: modoFiltro === m.key ? T.text : T.white,
                borderWidth: 0.5, borderColor: modoFiltro === m.key ? T.text : T.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: modoFiltro === m.key ? '#fff' : T.muted }}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tabs dinámicas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabs}>
            {(modoFiltro === 'temperatura' ? GRUPOS_TEMP : GRUPOS_ETAPA).map(g => {
              const count = modoFiltro === 'temperatura'
                ? g.key === 'sold'
                  ? clients.filter(c => c.sold).length
                  : clients.filter(c => c.temperature === g.key && !c.sold).length
                : clients.filter(c => c.etapa === g.key && !c.sold).length
              const isActive = activo === g.key
              return (
                <TouchableOpacity
                  key={g.key}
                  onPress={() => setActivo(g.key)}
                  style={[styles.tab, {
                    backgroundColor: isActive ? g.color : T.white,
                    borderColor: isActive ? g.color : T.border,
                  }]}
                >
                  <Text style={[styles.tabText, { color: isActive ? '#fff' : T.muted }]}>
                    {g.label}
                  </Text>
                  <View style={[styles.tabCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : T.bg }]}>
                    <Text style={[styles.tabCountText, { color: isActive ? '#fff' : T.muted }]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>

        {filtrados.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin clientes en esta categoría</Text>
          </View>
        ) : filtrados.map(c => (
          <TouchableOpacity key={c.id} style={[styles.card, { borderColor: tempColor(c.temperature) + '44' }]} onPress={() => router.push(`/cliente/${c.id}`)}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: '#6366F1' }]}>
                <Text style={styles.avatarText}>{c.name.slice(0,2).toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{c.name}</Text>
                <Text style={styles.cardVehicle}>{c.vehicle_interest || 'Sin vehículo'}</Text>
                {c.budget && <Text style={styles.cardBudget}>{c.budget}</Text>}
                {c.etapa && (
                  <Text style={styles.cardEtapa}>
                    {{
                      interesado: '👀 Interesado',
                      evaluando:  '🤔 Evaluando',
                      objecion:   '💬 Objeción',
                      documentos: '📄 Documentos',
                      cierre:     '🏆 Cierre',
                    }[c.etapa]}
                  </Text>
                )}
              </View>
              <View style={styles.actions}>
                <Text style={styles.actionBtn}>📞</Text>
                <Text style={styles.actionBtn}>💬</Text>
              </View>
            </View>
            {c.docs_received && (
              <Text style={styles.docsTag}>📄 Documentos recibidos</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: T.bg },
  content:      { padding: 20, paddingTop: 60, paddingBottom: 100 },
  titulo:       { color: T.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sub:          { color: T.muted, fontSize: 12, marginTop: 4, marginBottom: 16, fontWeight: '500' },
  tabsScroll:   { marginBottom: 16 },
  tabs:         { flexDirection: 'row', gap: 8 },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5 },
  tabText:      { fontSize: 12, fontWeight: '700' },
  tabCount:     { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountText: { fontSize: 11, fontWeight: '700' },
  card:         { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 0.5 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontSize: 13, fontWeight: '800' },
  cardInfo:     { flex: 1 },
  cardName:     { color: T.text, fontSize: 14, fontWeight: '700' },
  cardVehicle:  { color: T.textSub, fontSize: 12, marginTop: 2 },
  cardBudget:   { color: T.accentText, fontSize: 11, marginTop: 2, fontWeight: '600' },
  cardEtapa:    { color: T.muted, fontSize: 11, marginTop: 2 },
  actions:      { gap: 8 },
  actionBtn:    { fontSize: 20 },
  docsTag:      { color: T.green, fontSize: 11, fontWeight: '700', marginTop: 8 },
  empty:        { alignItems: 'center', marginTop: 60 },
  emptyText:    { color: T.muted, fontSize: 14 },
})