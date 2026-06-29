import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'

export default function MetricasScreen() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const data = await getClients()
      setClients(data)
    } catch (e) {
      console.error(e)
    }
  }

  const total    = clients.length
  const hot      = clients.filter(c => c.temperature === 'hot' && !c.sold).length
  const warm     = clients.filter(c => c.temperature === 'warm' && !c.sold).length
  const cold     = clients.filter(c => c.temperature === 'cold' && !c.sold).length
  const vendidos = clients.filter(c => c.sold).length
  const tasaCierre = total > 0 ? Math.round((vendidos / total) * 100) : 0
  const conDocs  = clients.filter(c => c.docs_received).length

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Métricas</Text>
      <Text style={styles.sub}>Tu rendimiento de ventas</Text>

      {/* Tasa de cierre */}
      <View style={styles.mainCard}>
        <Text style={styles.mainNum}>{tasaCierre}%</Text>
        <Text style={styles.mainLabel}>Tasa de cierre</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${tasaCierre}%` }]} />
        </View>
        <Text style={styles.mainSub}>{vendidos} vendidos de {total} totales</Text>
      </View>

      {/* Embudo clickeable */}
      <Text style={styles.sectionLabel}>EMBUDO</Text>
      <View style={styles.grid}>
        {[
          { num: hot,      label: 'Hot',      color: '#FF4444', dim: '#2A0808', filter: 'hot' },
          { num: warm,     label: 'Warm',     color: '#F0A020', dim: '#2A1A00', filter: 'warm' },
          { num: cold,     label: 'Cold',     color: '#4A8AE8', dim: '#0A1428', filter: 'cold' },
          { num: vendidos, label: 'Cerrados', color: '#22C97A', dim: '#082A18', filter: 'sold' },
        ].map(s => (
          <TouchableOpacity
            key={s.label}
            style={[styles.gridCard, { backgroundColor: s.dim, borderColor: s.color + '44' }]}
            onPress={() => router.push(`/pipeline?filter=${s.filter}`)}
          >
            <Text style={[styles.gridNum, { color: s.color }]}>{s.num}</Text>
            <Text style={[styles.gridLabel, { color: s.color }]}>{s.label}</Text>
            <Text style={[styles.gridArrow, { color: s.color }]}>Ver →</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Documentación clickeable */}
      <Text style={styles.sectionLabel}>DOCUMENTACIÓN</Text>
      <View style={styles.docsCard}>
        <TouchableOpacity style={styles.docsRow} onPress={() => router.push('/clientes?filter=docs')}>
          <Text style={styles.docsLabel}>📄 Con documentos</Text>
          <View style={styles.docsRight}>
            <Text style={styles.docsNum}>{conDocs}</Text>
            <Text style={styles.docsArrow}>Ver →</Text>
          </View>
        </TouchableOpacity>
        <View style={[styles.docsRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.docsLabel}>⏳ Sin documentos</Text>
          <Text style={styles.docsNum}>{total - conDocs}</Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: total > 0 ? `${Math.round((conDocs/total)*100)}%` : '0%', backgroundColor: '#22C97A' }]} />
        </View>
      </View>

      {/* Foco de hoy clickeable */}
      <TouchableOpacity style={styles.tipCard} onPress={() => router.push('/')}>
        <Text style={styles.tipTitle}>💡 Foco de hoy</Text>
        <Text style={styles.tipText}>
          {hot > 0
            ? `Tenés ${hot} cliente${hot > 1 ? 's' : ''} Hot. Priorizalos — son los más cercanos al cierre.`
            : warm > 0
            ? `Sin clientes Hot hoy. Trabajá los ${warm} Warm para subirlos de temperatura.`
            : 'Sin clientes activos. Agregá nuevos prospectos para arrancar el embudo.'}
        </Text>
        <Text style={styles.tipArrow}>Ver Tu Día →</Text>
      </TouchableOpacity>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0A0A0F' },
  content:      { padding: 20, paddingTop: 60, paddingBottom: 100 },
  titulo:       { color: '#EEEEF5', fontSize: 22, fontWeight: '800' },
  sub:          { color: '#55556A', fontSize: 12, marginTop: 4, marginBottom: 20 },
  mainCard:     { backgroundColor: '#1A1A24', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#252535' },
  mainNum:      { color: '#F0A020', fontSize: 52, fontWeight: '800', letterSpacing: -2 },
  mainLabel:    { color: '#EEEEF5', fontSize: 16, fontWeight: '700', marginTop: 4 },
  mainSub:      { color: '#55556A', fontSize: 12, marginTop: 8 },
  barBg:        { height: 6, backgroundColor: '#252535', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  barFill:      { height: 6, backgroundColor: '#F0A020', borderRadius: 3 },
  sectionLabel: { color: '#55556A', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  gridCard:     { width: '48%', borderRadius: 14, padding: 16, borderWidth: 1 },
  gridNum:      { fontSize: 32, fontWeight: '800' },
  gridLabel:    { fontSize: 12, fontWeight: '700', marginTop: 4 },
  gridArrow:    { fontSize: 11, fontWeight: '600', marginTop: 8, opacity: 0.7 },
  docsCard:     { backgroundColor: '#1A1A24', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#252535' },
  docsRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#252535' },
  docsLabel:    { color: '#AAAABF', fontSize: 13 },
  docsRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docsNum:      { color: '#EEEEF5', fontSize: 13, fontWeight: '700' },
  docsArrow:    { color: '#22C97A', fontSize: 11, fontWeight: '600' },
  tipCard:      { backgroundColor: '#082A18', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#22C97A33' },
  tipTitle:     { color: '#22C97A', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  tipText:      { color: '#AAAABF', fontSize: 13, lineHeight: 20 },
  tipArrow:     { color: '#22C97A', fontSize: 11, fontWeight: '600', marginTop: 10 },
})