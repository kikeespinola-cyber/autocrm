import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'
import { T } from '../lib/theme'
import * as Clipboard from 'expo-clipboard'

const NEGRO = '#1A1A2E'

export default function PostVentaScreen() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [copiado, setCopiado] = useState<string | null>(null)

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

  function proximoHito(dias: number): { label: string; color: string; icon: string; urgente: boolean } {
    if (dias < 7)   return { label: 'Llamar a los 7 días — ¿cómo va el vehículo?', color: T.warm,   icon: 'call-outline',      urgente: false }
    if (dias < 30)  return { label: 'Contacto al mes — evacuar dudas',             color: T.warm,   icon: 'chatbubble-outline', urgente: dias >= 25 }
    if (dias < 90)  return { label: 'Recordatorio service 3 meses',                color: T.blue,   icon: 'construct-outline',  urgente: dias >= 85 }
    if (dias < 180) return { label: 'Seguimiento 6 meses — pedir referido',        color: '#8B5CF6', icon: 'people-outline',    urgente: dias >= 175 }
    return { label: 'Contacto anual — fidelización', color: T.green, icon: 'heart-outline', urgente: false }
  }

  function generarMensajeReferido(nombre: string): string {
    return `¡Hola ${nombre}! Espero que estés disfrutando el vehículo. Si conocés a alguien que esté buscando, con gusto lo atiendo con la misma atención que a vos. ¡Gracias por confiar en mí!`
  }

  function copiarMensaje(texto: string, id: string) {
    {
      Clipboard.setStringAsync(texto)
      setCopiado(id)
      setTimeout(() => setCopiado(null), 2000)
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>Post-venta</Text>
        <Text style={styles.sub}>El vínculo no termina en la entrega</Text>

        {cumpleHoy.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="gift" size={13} color={T.muted} />
              <Text style={styles.sectionLabel}>CUMPLEAÑOS HOY</Text>
            </View>
            {cumpleHoy.map(c => (
              <View key={c.id} style={styles.card}>
                <View style={[styles.strip, { backgroundColor: T.warm }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardRow}>
                    <View style={[styles.avatar, { backgroundColor: T.warmDim }]}>
                      <Ionicons name="gift" size={19} color={T.warmText} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{c.name}</Text>
                      <Text style={styles.cardDetail}>¡Hoy es su cumpleaños!</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.btnAccion}
                      onPress={() => copiarMensaje(`¡Feliz cumpleaños ${c.name.split(' ')[0]}! Que lo pases genial.`, `bday-${c.id}`)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={copiado === `bday-${c.id}` ? 'checkmark' : 'copy-outline'}
                        size={13}
                        color={copiado === `bday-${c.id}` ? T.green : T.warmText}
                      />
                      <Text style={[styles.btnAccionText, copiado === `bday-${c.id}` && { color: T.green }]}>
                        {copiado === `bday-${c.id}` ? 'Copiado' : 'Saludo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={[styles.sectionHeader, cumpleHoy.length > 0 && { marginTop: 20 }]}>
          <Ionicons name="calendar" size={13} color={T.muted} />
          <Text style={styles.sectionLabel}>SEGUIMIENTO POST-ENTREGA</Text>
        </View>

        {vendidos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={38} color={T.muted} />
            <Text style={styles.emptyText}>Sin ventas cerradas todavía</Text>
            <Text style={styles.emptySub}>Cuando cierres una venta aparece acá</Text>
          </View>
        ) : vendidos.map(c => {
          const dias = diasDesdeEntrega(c.sale_date)
          const hito = proximoHito(dias)
          return (
            <View key={c.id} style={styles.card}>
              <View style={[styles.strip, { backgroundColor: hito.urgente ? T.red : T.green }]} />
              <View style={styles.cardBody}>
                <TouchableOpacity onPress={() => router.push(`/cliente/${c.id}`)} activeOpacity={0.7}>
                  <View style={styles.cardRow}>
                    <View style={[styles.avatar, { backgroundColor: T.greenDim }]}>
                      <Text style={[styles.avatarText, { color: T.green }]}>
                        {c.name.slice(0,2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={1}>{c.name}</Text>
                      <View style={styles.metaRow}>
                        <Ionicons name="checkmark-circle" size={12} color={T.green} />
                        <Text style={styles.cardDetail} numberOfLines={1}>{c.vehicle_interest}</Text>
                      </View>
                      {c.sale_date && (
                        <Text style={styles.cardDias}>Entregado hace {dias} día{dias !== 1 ? 's' : ''}</Text>
                      )}
                    </View>
                    {hito.urgente && (
                      <View style={styles.urgenteBadge}>
                        <Ionicons name="alert" size={14} color={T.red} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={[styles.hitoBox, { backgroundColor: hito.color + '14' }]}>
                  <Ionicons name={hito.icon as any} size={14} color={hito.color} />
                  <Text style={[styles.hitoText, { color: hito.color }]}>{hito.label}</Text>
                </View>

                <View style={styles.postActions}>
                  <TouchableOpacity
                    style={styles.postBtn}
                    onPress={() => router.push(`/cliente/${c.id}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-text-outline" size={14} color={T.textSub} />
                    <Text style={styles.postBtnText}>Ver ficha</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.postBtn, { borderColor: T.accent + '55' }]}
                    onPress={() => copiarMensaje(generarMensajeReferido(c.name.split(' ')[0]), `ref-${c.id}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={copiado === `ref-${c.id}` ? 'checkmark' : 'sparkles'}
                      size={14}
                      color={copiado === `ref-${c.id}` ? T.green : T.accentText}
                    />
                    <Text style={[styles.postBtnText, { color: copiado === `ref-${c.id}` ? T.green : T.accentText }]}>
                      {copiado === `ref-${c.id}` ? 'Copiado' : 'Msg referido'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        })}

        {vendidos.length > 0 && (
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={16} color={T.green} />
              <Text style={styles.tipTitle}>Regla de oro del post-venta</Text>
            </View>
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
  container:     { flex: 1, backgroundColor: T.bg },
  content:       { padding: 20, paddingTop: 24, paddingBottom: 60 },

  titulo:        { color: NEGRO, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  sub:           { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 20, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  sectionLabel:  { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },

  card:          { backgroundColor: T.white, borderRadius: 16, marginBottom: 10, borderWidth: 0.5, borderColor: T.border, flexDirection: 'row', overflow: 'hidden' },
  strip:         { width: 4 },
  cardBody:      { flex: 1, padding: 14 },
  cardRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 14, fontWeight: '800' },
  cardInfo:      { flex: 1 },
  cardName:      { color: NEGRO, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  cardDetail:    { color: T.textSub, fontSize: 12.5, flex: 1 },
  cardDias:      { color: T.muted, fontSize: 11, marginTop: 3 },
  urgenteBadge:  { width: 28, height: 28, borderRadius: 14, backgroundColor: T.redDim, alignItems: 'center', justifyContent: 'center' },

  hitoBox:       { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, marginTop: 12 },
  hitoText:      { fontSize: 11.5, fontWeight: '600', flex: 1 },

  postActions:   { flexDirection: 'row', gap: 8, marginTop: 10 },
  postBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 0.5, borderColor: T.border, borderRadius: 10, paddingVertical: 10 },
  postBtnText:   { color: T.textSub, fontSize: 11.5, fontWeight: '600' },

  btnAccion:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.warmDim, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  btnAccionText: { color: T.warmText, fontSize: 11, fontWeight: '700' },

  empty:         { alignItems: 'center', marginTop: 50, gap: 8 },
  emptyText:     { color: NEGRO, fontSize: 14.5, fontWeight: '700' },
  emptySub:      { color: T.muted, fontSize: 12.5 },

  tipCard:       { backgroundColor: T.greenDim, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 0.5, borderColor: T.green + '44' },
  tipHeader:     { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  tipTitle:      { color: T.green, fontSize: 13.5, fontWeight: '800' },
  tipText:       { color: T.greenText, fontSize: 12.5, lineHeight: 19 },
})
