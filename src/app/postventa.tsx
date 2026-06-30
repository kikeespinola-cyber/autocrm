import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'
import { T } from '../lib/theme'

export default function PostVentaScreen() {
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

  const vendidos = clients.filter(c => c.sold)

  function diasDesdeEntrega(saleDate: string | null): number {
    if (!saleDate) return 0
    const diff = new Date().getTime() - new Date(saleDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  function proximoHito(dias: number): { label: string; color: string; urgente: boolean } {
    if (dias < 7)   return { label: 'Llamar a los 7 días — ¿cómo va el vehículo?', color: T.warm, urgente: false }
    if (dias < 30)  return { label: 'Contacto al mes — evacuar dudas', color: T.warm, urgente: dias >= 25 }
    if (dias < 90)  return { label: 'Recordatorio service 3 meses', color: T.blue, urgente: dias >= 85 }
    if (dias < 180) return { label: 'Seguimiento 6 meses — pedir referido', color: T.purple, urgente: dias >= 175 }
    return { label: 'Contacto anual — fidelización', color: T.green, urgente: false }
  }

  function generarMensajeReferido(nombre: string): string {
    return `¡Hola ${nombre}! Espero que estés disfrutando el vehículo. Si conocés a alguien que esté buscando, con gusto lo atiendo con la misma atención que a vos. ¡Gracias por confiar en mí! 🚗`
  }

  function copiarMensaje(texto: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(texto)
    }
  }

  const cumpleHoy = clients.filter(c => {
    if (!c.birthday) return false
    const hoy = new Date()
    const mes = hoy.toLocaleString('es-PY', { month: 'short' })
    const dia = hoy.getDate()
    return c.birthday.includes(String(dia)) && c.birthday.toLowerCase().includes(mes.toLowerCase())
  })

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Post-venta</Text>
        <Text style={styles.sub}>El vínculo no termina en la entrega.</Text>

        {cumpleHoy.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>🎂 CUMPLEAÑOS HOY</Text>
            {cumpleHoy.map(c => (
              <View key={c.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: T.warm }]}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardIcon}>🎂</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{c.name}</Text>
                    <Text style={styles.cardDetail}>¡Hoy es su cumpleaños!</Text>
                  </View>
                  <TouchableOpacity style={styles.btnAccion} onPress={() => copiarMensaje(`¡Feliz cumpleaños ${c.name}! 🎉 Que lo pases genial.`)}>
                    <Text style={styles.btnAccionText}>Copiar saludo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>📅 SEGUIMIENTO POST-ENTREGA</Text>
        {vendidos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin ventas cerradas todavía</Text>
            <Text style={styles.emptySub}>Cuando cierres una venta aparece acá</Text>
          </View>
        ) : vendidos.map(c => {
          const dias = diasDesdeEntrega(c.sale_date)
          const hito = proximoHito(dias)
          return (
            <TouchableOpacity key={c.id} style={[styles.card, hito.urgente && { borderLeftWidth: 3, borderLeftColor: T.red }]} onPress={() => router.push(`/cliente/${c.id}`)}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: T.greenDim }]}>
                  <Text style={[styles.avatarText, { color: T.green }]}>{c.name.slice(0,2).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.cardDetail}>✅ {c.vehicle_interest}</Text>
                  <Text style={[styles.cardHito, { color: hito.color }]}>{hito.label}</Text>
                  {c.sale_date && <Text style={styles.cardDias}>Entrega hace {dias} días</Text>}
                </View>
                {hito.urgente && <Text style={{ color: T.red, fontSize: 20, fontWeight: '800' }}>!</Text>}
              </View>
              <View style={styles.postActions}>
                <TouchableOpacity style={styles.postBtn} onPress={() => router.push(`/cliente/${c.id}`)}>
                  <Text style={styles.postBtnText}>📋 Ver ficha</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.postBtn, { borderColor: T.accentDim }]} onPress={() => copiarMensaje(generarMensajeReferido(c.name.split(' ')[0]))}>
                  <Text style={[styles.postBtnText, { color: T.accentText }]}>✦ Copiar msg referido</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )
        })}

        {vendidos.length > 0 && (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Regla de oro del post-venta</Text>
            <Text style={styles.tipText}>
              Un cliente satisfecho puede traerte 2-3 referidos. El mejor momento para pedirlo es entre el primer mes y los 3 meses de la entrega.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: T.bg },
  content:      { padding: 20, paddingTop: 60, paddingBottom: 100 },
  titulo:       { color: T.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sub:          { color: T.muted, fontSize: 12, marginTop: 4, marginBottom: 20, fontWeight: '500' },
  sectionLabel: { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 8 },
  card:         { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: T.border },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon:     { fontSize: 28 },
  avatar:       { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 13, fontWeight: '800' },
  cardInfo:     { flex: 1 },
  cardName:     { color: T.text, fontSize: 14, fontWeight: '700' },
  cardDetail:   { color: T.textSub, fontSize: 12, marginTop: 2 },
  cardHito:     { fontSize: 11, fontWeight: '600', marginTop: 4 },
  cardDias:     { color: T.muted, fontSize: 10, marginTop: 2 },
  postActions:  { flexDirection: 'row', gap: 8, marginTop: 10 },
  postBtn:      { flex: 1, borderWidth: 0.5, borderColor: T.border, borderRadius: 8, padding: 8, alignItems: 'center' },
  postBtnText:  { color: T.textSub, fontSize: 11, fontWeight: '600' },
  btnAccion:    { backgroundColor: T.warmDim, borderRadius: 8, padding: 8, borderWidth: 0.5, borderColor: T.warm + '44' },
  btnAccionText:{ color: T.warmText, fontSize: 10, fontWeight: '700' },
  empty:        { alignItems: 'center', marginTop: 40 },
  emptyText:    { color: T.text, fontSize: 14, fontWeight: '700' },
  emptySub:     { color: T.muted, fontSize: 12, marginTop: 6 },
  tipCard:      { backgroundColor: T.greenDim, borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 0.5, borderColor: T.green + '44' },
  tipTitle:     { color: T.green, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  tipText:      { color: T.greenText, fontSize: 12, lineHeight: 18 },
})