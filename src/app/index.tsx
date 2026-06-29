import { View, Text, StyleSheet, ScrollView } from 'react-native'

const urgentes = [
  { id: 1, nombre: 'Carlos Mendoza', accion: '3er contacto — plan de pago', temp: 'hot' },
  { id: 2, nombre: 'Diego Portillo', accion: 'Lead nuevo — contactar YA', temp: 'hot' },
]

const masTarde = [
  { id: 3, nombre: 'Laura Giménez', accion: 'Sin respuesta — cambiar ángulo', temp: 'warm' },
  { id: 4, nombre: 'Sofía Benítez', accion: 'Post-venta — 15 días desde entrega', temp: 'cold' },
]

const tempColor = (t: string) => t === 'hot' ? '#FF4444' : t === 'warm' ? '#F0A020' : '#4A8AE8'
const tempLabel = (t: string) => t === 'hot' ? '🔴 Hot' : t === 'warm' ? '🟡 Warm' : '🔵 Cold'
const tempDim = (t: string) => t === 'hot' ? '#2A0808' : t === 'warm' ? '#2A1A00' : '#0A1428'

export default function HoyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.fecha}>Lunes, 29 de junio</Text>
      <Text style={styles.titulo}>Tu día · 4 acciones</Text>

      <View style={styles.statsRow}>
        {[
          { num: 3, label: 'Activos', color: '#F0A020' },
          { num: 1, label: 'Cerrados', color: '#22C97A' },
          { num: 2, label: 'Urgentes', color: '#FF4444' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>AHORA MISMO</Text>
      {urgentes.map(c => (
        <View key={c.id} style={[styles.card, { borderColor: '#FF444433' }]}>
          <View style={styles.cardRow}>
            <View style={[styles.dot, { backgroundColor: '#FF4444' }]} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{c.nombre}</Text>
              <Text style={[styles.cardAccion, { color: '#FF4444' }]}>{c.accion}</Text>
            </View>
            <Text style={[styles.badge, { color: tempColor(c.temp), backgroundColor: tempDim(c.temp) }]}>
              {tempLabel(c.temp)}
            </Text>
          </View>
        </View>
      ))}

      <Text style={styles.sectionLabel}>MÁS TARDE HOY</Text>
      {masTarde.map(c => (
        <View key={c.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.dot, { backgroundColor: tempColor(c.temp) }]} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{c.nombre}</Text>
              <Text style={styles.cardAccion}>{c.accion}</Text>
            </View>
            <Text style={[styles.badge, { color: tempColor(c.temp), backgroundColor: tempDim(c.temp) }]}>
              {tempLabel(c.temp)}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { padding: 20, paddingTop: 60 },
  fecha: { color: '#55556A', fontSize: 12, letterSpacing: 1 },
  titulo: { color: '#EEEEF5', fontSize: 22, fontWeight: '800', marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#1A1A24', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#252535' },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { color: '#55556A', fontSize: 11, marginTop: 2 },
  sectionLabel: { color: '#55556A', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  card: { backgroundColor: '#1A1A24', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#252535' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardInfo: { flex: 1 },
  cardName: { color: '#EEEEF5', fontSize: 14, fontWeight: '700' },
  cardAccion: { color: '#AAAABF', fontSize: 12, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
})