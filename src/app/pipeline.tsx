import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'
import { proximoContactoTexto } from '../lib/protocolo'
import { T } from '../lib/theme'
import Tooltip from '../components/Tooltip'
import { tooltipVisto, marcarTooltipVisto } from '../lib/tooltips'

const NEGRO = '#1A1A2E'

const GRUPOS_TEMP = [
  { key: 'hot',  label: 'Hot',      color: '#EF4444' },
  { key: 'warm', label: 'Warm',     color: '#F59E0B' },
  { key: 'cold', label: 'Cold',     color: '#4A8AE8' },
  { key: 'sold', label: 'Cerrados', color: '#10B981' },
]

const GRUPOS_ETAPA = [
  { key: 'interesado', label: 'Interesado', color: '#3B82F6', icon: 'eye-outline' },
  { key: 'evaluando',  label: 'Evaluando',  color: '#F59E0B', icon: 'search-outline' },
  { key: 'objecion',   label: 'Objeción',   color: '#EF4444', icon: 'chatbubble-outline' },
  { key: 'documentos', label: 'Documentos', color: '#04dedf', icon: 'document-text-outline' },
  { key: 'cierre',     label: 'Cierre',     color: '#10B981', icon: 'trophy-outline' },
]

const ETAPA_LABEL: Record<string, string> = {
  interesado: 'Interesado',
  evaluando:  'Evaluando',
  objecion:   'Objeción',
  documentos: 'Documentos',
  cierre:     'Cierre',
}

const ETAPA_ICON: Record<string, any> = {
  interesado: 'eye-outline',
  evaluando:  'search-outline',
  objecion:   'chatbubble-outline',
  documentos: 'document-text-outline',
  cierre:     'trophy-outline',
}

export default function PipelineScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ filter?: string }>()
  const [clients, setClients]           = useState<Client[]>([])
  const [loading, setLoading]           = useState(true)
  const [activo, setActivo]             = useState(params.filter || 'hot')
  const [modoFiltro, setModoFiltro]     = useState<'temperatura'|'etapa'>('temperatura')
  const [mostrarTooltip, setMostrarTooltip] = useState(false)

  useFocusEffect(
    React.useCallback(() => {
      cargar()
      tooltipVisto('pipeline').then(visto => {
        if (!visto) setMostrarTooltip(true)
      })
    }, [])
  )

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
  const tempDim   = (t: string) => t === 'hot' ? '#FEE2E2' : t === 'warm' ? '#FEF3C7' : '#DBEAFE'
  const tempText  = (t: string) => t === 'hot' ? '#991B1B' : t === 'warm' ? '#92400E' : '#1E40AF'

  function llamar(phone: string | null) {
    if (!phone) return
    Linking.openURL(`tel:${phone}`)
  }

  function whatsapp(phone: string | null) {
    if (!phone) return
    const num = phone.replace(/\D/g, '')
    Linking.openURL(`https://wa.me/595${num}`)
  }

  const grupos = modoFiltro === 'temperatura' ? GRUPOS_TEMP : GRUPOS_ETAPA

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>Pipeline</Text>
        <Text style={styles.sub}>
          {clients.filter(c => !c.sold).length} activos · {clients.filter(c => c.sold).length} cerrados
        </Text>

        <View style={styles.modoRow}>
          {[
            { key: 'temperatura', label: 'Temperatura', icon: 'thermometer-outline' },
            { key: 'etapa',       label: 'Etapa',       icon: 'layers-outline' },
          ].map(m => {
            const act = modoFiltro === m.key
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => {
                  setModoFiltro(m.key as any)
                  setActivo(m.key === 'temperatura' ? 'hot' : 'interesado')
                }}
                style={[styles.modoBtn, act && styles.modoBtnActivo]}
                activeOpacity={0.8}
              >
                <Ionicons name={m.icon as any} size={14} color={act ? '#fff' : T.textSub} />
                <Text style={[styles.modoText, act && styles.modoTextActivo]}>{m.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabs}
        >
          {grupos.map((g: any) => {
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
                style={[styles.tab, isActive && { backgroundColor: NEGRO, borderColor: NEGRO }]}
                activeOpacity={0.8}
              >
                {modoFiltro === 'temperatura' ? (
                  <View style={[styles.dot, { backgroundColor: g.color }]} />
                ) : (
                  <Ionicons name={g.icon} size={14} color={isActive ? '#fff' : g.color} />
                )}
                <Text style={[styles.tabText, isActive && { color: '#fff' }]}>{g.label}</Text>
                <View style={[styles.tabCount, isActive && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.tabCountText, isActive && { color: '#fff' }]}>{count}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {filtrados.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="funnel-outline" size={40} color={T.muted} />
            <Text style={styles.emptyText}>Sin clientes acá</Text>
            <Text style={styles.emptySub}>Probá con otro filtro o agregá clientes desde la pestaña Clientes</Text>
          </View>
        ) : filtrados.map(c => (
          <View key={c.id} style={styles.card}>
            <View style={[styles.tempStrip, { backgroundColor: tempColor(c.temperature) }]} />
            <View style={styles.cardBody}>
              <TouchableOpacity onPress={() => router.push(`/cliente/${c.id}`)} activeOpacity={0.7}>
                <View style={styles.cardRow}>
                  <View style={[styles.avatar, { backgroundColor: tempDim(c.temperature) }]}>
                    <Text style={[styles.avatarText, { color: tempText(c.temperature) }]}>
                      {c.name.slice(0,2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.cardVehicle} numberOfLines={1}>
                      {c.vehicle_interest || 'Sin vehículo'}
                    </Text>
                    {c.etapa ? (
                      <View style={styles.inlineRow}>
                        <Ionicons name={ETAPA_ICON[c.etapa]} size={11} color={T.muted} />
                        <Text style={styles.cardEtapa}>{ETAPA_LABEL[c.etapa]}</Text>
                      </View>
                    ) : null}
                    {/* El pipeline filtra por temperatura, pero si el cliente
                        tiene fecha fijada esa regla no lo alcanza: hay que verlo. */}
                    {c.next_contact_at ? (
                      <View style={styles.inlineRow}>
                        <Ionicons name="calendar" size={11} color={T.purpleText} />
                        <Text style={styles.cardFecha}>{proximoContactoTexto(c)}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => llamar(c.phone)}
                      disabled={!c.phone}
                    >
                      <Ionicons name="call" size={15} color={c.phone ? T.green : T.border} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => whatsapp(c.phone)}
                      disabled={!c.phone}
                    >
                      <Ionicons name="logo-whatsapp" size={15} color={c.phone ? '#25D366' : T.border} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>

              {(c.budget || c.docs_received) && (
                <View style={styles.cardFooter}>
                  {c.budget ? (
                    <View>
                      <Text style={styles.budgetLabel}>Presupuesto</Text>
                      <Text style={styles.budgetValue}>{c.budget}</Text>
                    </View>
                  ) : <View />}
                  {c.docs_received && (
                    <View style={styles.docsTag}>
                      <Ionicons name="checkmark-circle" size={13} color={T.green} />
                      <Text style={styles.docsText}>Docs recibidos</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <Tooltip
        visible={mostrarTooltip}
        titulo="Pipeline"
        descripcion="Tu embudo de ventas. Filtrá por temperatura (Hot/Warm/Cold) o por etapa de compra. Hot = acción urgente, Warm = seguimiento activo, Cold = reactivar. La temperatura cambia sola según el tiempo sin contacto."
        onCerrar={() => { setMostrarTooltip(false); marcarTooltipVisto('pipeline') }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: T.bg },
  content:      { padding: 20, paddingTop: 24, paddingBottom: 100 },
  inlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },

  titulo:       { color: NEGRO, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  sub:          { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 18, fontWeight: '500' },

  modoRow:      { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modoBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: T.white, borderWidth: 0.5, borderColor: T.border },
  modoBtnActivo:{ backgroundColor: NEGRO, borderColor: NEGRO },
  modoText:     { fontSize: 12.5, fontWeight: '600', color: T.textSub },
  modoTextActivo:{ color: '#fff' },

  tabsScroll:   { marginBottom: 18, marginHorizontal: -20 },
  tabs:         { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  tab:          { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: T.white, borderWidth: 0.5, borderColor: T.border },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  tabText:      { fontSize: 13, fontWeight: '600', color: T.textSub },
  tabCount:     { backgroundColor: T.bg, borderRadius: 10, minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  tabCountText: { fontSize: 11, fontWeight: '800', color: T.muted },

  card:         { backgroundColor: T.white, borderRadius: 16, marginBottom: 10, borderWidth: 0.5, borderColor: T.border, flexDirection: 'row', overflow: 'hidden' },
  tempStrip:    { width: 4 },
  cardBody:     { flex: 1, padding: 14 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 15, fontWeight: '800' },
  cardInfo:     { flex: 1 },
  cardName:     { color: NEGRO, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  cardVehicle:  { color: T.textSub, fontSize: 12.5, marginTop: 2 },
  cardEtapa:    { color: T.muted, fontSize: 11 },
  cardFecha:    { color: T.purpleText, fontSize: 11, fontWeight: '700' },

  actions:      { flexDirection: 'row', gap: 6 },
  actionBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },

  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 11, borderTopWidth: 0.5, borderTopColor: T.border },
  budgetLabel:  { color: T.muted, fontSize: 11, fontWeight: '500' },
  budgetValue:  { color: NEGRO, fontSize: 14, fontWeight: '800', letterSpacing: -0.2, marginTop: 1 },
  docsTag:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  docsText:     { color: T.green, fontSize: 11, fontWeight: '700' },

  empty:        { alignItems: 'center', marginTop: 70, gap: 10 },
  emptyText:    { color: NEGRO, fontSize: 16, fontWeight: '700' },
  emptySub:     { color: T.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 20, marginTop: 2 },
})
