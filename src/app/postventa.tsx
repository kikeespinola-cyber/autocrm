import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'
import { supabase } from '../lib/supabase'

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
    if (dias < 7)   return { label: 'Llamar a los 7 días — ¿cómo va el vehículo?', color: '#F0A020', urgente: false }
    if (dias < 30)  return { label: 'Contacto al mes — evacuar dudas', color: '#F0A020', urgente: dias >= 25 }
    if (dias < 90)  return { label: 'Recordatorio service 3 meses', color: '#4A8AE8', urgente: dias >= 85 }
    if (dias < 180) return { label: 'Seguimiento 6 meses — pedir referido', color: '#8B5CF6', urgente: dias >= 175 }
    return { label: 'Contacto anual — fidelización', color: '#22C97A', urgente: false }
  }

  function generarMensajeReferido(nombre: string): string {
    return `¡Hola ${nombre}! Espero que estés disfrutando el vehículo. Te escribo porque tenemos nuevos modelos disponibles y pensé en vos. Si conocés a alguien que esté buscando, con gusto lo atiendo con la misma atención que a vos. ¡Gracias por confiar en mí! 🚗`
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

        {/* Cumpleaños hoy */}
        {cumpleHoy.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>🎂 CUMPLEAÑOS HOY</Text>
            {cumpleHoy.map(c => (
              <View key={c.id} style={[styles.card, { borderColor: '#F0A02044' }]}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardIcon}>🎂</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{c.name}</Text>
                    <Text style={styles.cardDetail}>¡Hoy es su cumpleaños!</Text>
                  </View>
                  <TouchableOpacity style={styles.btnAccion} onPress={() => copiarMensaje(`¡Feliz cumpleaños ${c.name}! 🎉 Que lo pases genial. Un saludo de parte del equipo.`)}>
                    <Text style={styles.btnAccionText}>Copiar saludo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Timeline de seguimiento */}
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
            <TouchableOpacity key={c.id} style={[styles.card, { borderColor: hito.urgente ? '#FF444433' : '#252535' }]} onPress={() => router.push(`/cliente/${c.id}`)}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: '#22C97A22' }]}>
                  <Text style={styles.avatarText}>{c.name.slice(0,2).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.cardDetail}>✅ {c.vehicle_interest}</Text>
                  <Text style={[styles.cardHito, { color: hito.color }]}>{hito.label}</Text>
                  {c.sale_date && <Text style={styles.cardDias}>Entrega hace {dias} días</Text>}
                </View>
                {hito.urgente && <Text style={styles.urgente}>!</Text>}
              </View>

              {/* Acciones rápidas post-venta */}
              <View style={styles.postActions}>
                <TouchableOpacity style={styles.postBtn} onPress={() => router.push(`/cliente/${c.id}`)}>
                  <Text style={styles.postBtnText}>📋 Ver ficha</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.postBtn, { borderColor: '#8B5CF644' }]} onPress={() => copiarMensaje(generarMensajeReferido(c.name.split(' ')[0]))}>
                  <Text style={[styles.postBtnText, { color: '#8B5CF6' }]}>✦ Copiar msg referido</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )
        })}

        {/* Tip referidos */}
        {vendidos.length > 0 && (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Regla de oro del post-venta</Text>
            <Text style={styles.tipText}>
              Un cliente satisfecho puede traerte 2-3 referidos. El mejor momento para pedirlo es entre el primer mes y los 3 meses de la entrega — cuando todavía está en la luna de miel con el vehículo.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0A0A0F' },
  content:        { padding: 20, paddingTop: 60, paddingBottom: 100 },
  titulo:         { color: '#EEEEF5', fontSize: 22, fontWeight: '800' },
  sub:            { color: '#55556A', fontSize: 12, marginTop: 4, marginBottom: 20 },
  sectionLabel:   { color: '#55556A', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10, marginTop: 8 },
  card:           { backgroundColor: '#1A1A24', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon:       { fontSize: 28 },
  avatar:         { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#22C97A', fontSize: 13, fontWeight: '800' },
  cardInfo:       { flex: 1 },
  cardName:       { color: '#EEEEF5', fontSize: 14, fontWeight: '700' },
  cardDetail:     { color: '#AAAABF', fontSize: 12, marginTop: 2 },
  cardHito:       { fontSize: 11, fontWeight: '600', marginTop: 4 },
  cardDias:       { color: '#55556A', fontSize: 10, marginTop: 2 },
  urgente:        { color: '#FF4444', fontSize: 20, fontWeight: '800' },
  postActions:    { flexDirection: 'row', gap: 8, marginTop: 10 },
  postBtn:        { flex: 1, borderWidth: 1, borderColor: '#252535', borderRadius: 8, padding: 8, alignItems: 'center' },
  postBtnText:    { color: '#AAAABF', fontSize: 11, fontWeight: '600' },
  btnAccion:      { backgroundColor: '#2A1A00', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#F0A02044' },
  btnAccionText:  { color: '#F0A020', fontSize: 10, fontWeight: '700' },
  empty:          { alignItems: 'center', marginTop: 40 },
  emptyText:      { color: '#EEEEF5', fontSize: 14, fontWeight: '700' },
  emptySub:       { color: '#55556A', fontSize: 12, marginTop: 6 },
  tipCard:        { backgroundColor: '#082A18', borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#22C97A33' },
  tipTitle:       { color: '#22C97A', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  tipText:        { color: '#AAAABF', fontSize: 12, lineHeight: 18 },
})