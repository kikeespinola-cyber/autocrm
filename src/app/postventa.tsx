import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useEffect } from 'react'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'

export default function PostVentaScreen() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

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

  const vendidos = clients.filter(c => c.sold)
  const proximosCumple = clients.filter(c => c.birthday)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Post-venta</Text>
        <Text style={styles.sub}>El vínculo no termina en la entrega.</Text>

        {/* Momentos clave */}
        {proximosCumple.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>MOMENTOS CLAVE</Text>
            {proximosCumple.map(c => (
              <View key={c.id} style={[styles.card, { borderColor: '#8B5CF644' }]}>
                <View style={styles.cardRow}>
                  <View style={styles.iconBox}>
                    <Text style={styles.iconText}>🎂</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{c.name}</Text>
                    <Text style={styles.cardDetail}>Cumpleaños: {c.birthday}</Text>
                  </View>
                  <TouchableOpacity style={styles.btnContactar}>
                    <Text style={styles.btnContactarText}>💬 Saludar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Clientes vendidos */}
        <Text style={styles.sectionLabel}>VEHÍCULOS ENTREGADOS</Text>
        {vendidos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin ventas cerradas todavía</Text>
            <Text style={styles.emptySub}>Cuando cierres una venta aparece acá</Text>
          </View>
        ) : vendidos.map(c => (
          <View key={c.id} style={[styles.card, { borderColor: '#22C97A44' }]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: '#22C97A33' }]}>
                <Text style={styles.avatarText}>{c.name.slice(0,2).toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{c.name}</Text>
                <Text style={styles.cardDetail}>✅ {c.vehicle_interest}</Text>
                {c.sale_date && <Text style={styles.cardDate}>Entrega: {c.sale_date}</Text>}
              </View>
              <TouchableOpacity style={styles.btnContactar}>
                <Text style={styles.btnContactarText}>Contactar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Tip referidos */}
        {vendidos.length > 0 && (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Pedí referidos</Text>
            <Text style={styles.tipText}>
              Un cliente satisfecho es tu mejor vendedor. Preguntale si tiene algún amigo o familiar buscando vehículo.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0A0A0F' },
  content:         { padding: 20, paddingTop: 60, paddingBottom: 100 },
  titulo:          { color: '#EEEEF5', fontSize: 22, fontWeight: '800' },
  sub:             { color: '#55556A', fontSize: 12, marginTop: 4, marginBottom: 20 },
  sectionLabel:    { color: '#55556A', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10, marginTop: 8 },
  card:            { backgroundColor: '#1A1A24', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
  cardRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox:         { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1A0A38', alignItems: 'center', justifyContent: 'center' },
  iconText:        { fontSize: 20 },
  avatar:          { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { color: '#22C97A', fontSize: 13, fontWeight: '800' },
  cardInfo:        { flex: 1 },
  cardName:        { color: '#EEEEF5', fontSize: 14, fontWeight: '700' },
  cardDetail:      { color: '#AAAABF', fontSize: 12, marginTop: 2 },
  cardDate:        { color: '#55556A', fontSize: 11, marginTop: 2 },
  btnContactar:    { backgroundColor: '#2A1A00', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#F0A02044' },
  btnContactarText:{ color: '#F0A020', fontSize: 11, fontWeight: '700' },
  empty:           { alignItems: 'center', marginTop: 40 },
  emptyText:       { color: '#EEEEF5', fontSize: 14, fontWeight: '700' },
  emptySub:        { color: '#55556A', fontSize: 12, marginTop: 6 },
  tipCard:         { backgroundColor: '#082A18', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1, borderColor: '#22C97A33' },
  tipTitle:        { color: '#22C97A', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  tipText:         { color: '#AAAABF', fontSize: 12, lineHeight: 18 },
})