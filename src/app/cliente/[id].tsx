import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Client, Interaction } from '../../lib/types'
import { supabase } from '../../lib/supabase'
import { generarSugerencia } from '../../lib/ia'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { T, tempColor, tempDim, tempTextColor, tempLabel } from '../../lib/theme'

const iconFor = (t: string) => ({ call:'📞', whatsapp:'💬', visit:'🏢', note:'📝', lead:'🌐', sale:'✅' }[t] || '📝')

export default function ClienteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient]             = useState<Client | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [tab, setTab]                   = useState<'info'|'historial'>('info')
  const [modalNota, setModalNota]       = useState(false)
  const [nota, setNota]                 = useState('')
  const [guardando, setGuardando]       = useState(false)
  const [sugerencia, setSugerencia]     = useState<string>('')
  const [mensajeIA, setMensajeIA]       = useState<string>('')
  const [cargandoIA, setCargandoIA]     = useState(false)
  const [copiado, setCopiado]           = useState(false)
  const { formatDual } = useTipoCambio()
  const interactionsRef = React.useRef<Interaction[]>([])

  useEffect(() => { cargar() }, [id])

  async function cargar() {
  const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
  const { data: i } = await supabase.from('interactions').select('*').eq('client_id', id).order('created_at', { ascending: false })
  if (i) {
    interactionsRef.current = i
    setInteractions(i)
  }
  if (c) {
    setClient(c)
    cargarSugerencia(c, i || [])
  }
}

  async function cargarSugerencia(c: Client, historial: any[]) {
    setCargandoIA(true)
    try {
      const res = await generarSugerencia(c.name, c.vehicle_interest, c.temperature, c.contact_count, historial)
      setSugerencia(res.sugerencia)
      setMensajeIA(res.mensaje)
    } catch (e) {
      setSugerencia('No se pudo generar sugerencia.')
      setMensajeIA('')
    } finally {
      setCargandoIA(false)
      setInteractions([...interactionsRef.current])
    }
  }

  async function registrarContacto(type: string, content: string) {
    await supabase.from('interactions').insert({ client_id: id, type, content })
    await supabase.from('clients').update({
      last_contact_at: new Date().toISOString(),
      contact_count: (client?.contact_count || 0) + 1
    }).eq('id', id)
    await cargar()
  }

  async function cambiarTemp(t: string) {
  await supabase.from('clients').update({ temperature: t }).eq('id', id)
  await cargar()
}

  async function marcarVendido() {
    const confirmar = typeof window !== 'undefined' ? window.confirm('¿Confirmás que se cerró esta venta?') : false
    if (!confirmar) return
    await supabase.from('clients').update({ sold: true, sale_date: new Date().toISOString().split('T')[0] }).eq('id', id)
    await supabase.from('interactions').insert({ client_id: id, type: 'sale', content: '✅ Venta cerrada' })
    setClient(prev => prev ? { ...prev, sold: true } : prev)
    if (typeof window !== 'undefined') window.alert('¡Venta cerrada! 🎉')
  }

  async function guardarNota() {
    if (!nota.trim()) return
    setGuardando(true)
    await supabase.from('interactions').insert({ client_id: id, type: 'note', content: nota.trim() })
    await supabase.from('clients').update({ last_contact_at: new Date().toISOString(), contact_count: (client?.contact_count || 0) + 1 }).eq('id', id)
    setNota(''); setModalNota(false); setGuardando(false)
    await cargar()
  }

  function abrirWhatsApp() {
    const phone = client?.phone?.replace(/\D/g, '') || ''
    if (typeof window !== 'undefined') window.open(`https://wa.me/595${phone}`, '_blank')
  }

  function llamar() {
    if (typeof window !== 'undefined') window.open(`tel:${client?.phone || ''}`)
  }

  function copiarMensaje() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(mensajeIA)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  if (!client) return (
    <View style={styles.loading}>
      <Text style={{ color: T.accent, fontSize: 16 }}>Cargando...</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>‹ Volver</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/cliente/editar/${id}`)}>
            <Text style={styles.editBtn}>Editar ✏️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: '#6366F1' }]}>
            <Text style={styles.avatarText}>{client.name.slice(0,2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{client.name}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: tempDim(client.temperature) }]}>
                <Text style={[styles.badgeText, { color: tempTextColor(client.temperature) }]}>{tempLabel(client.temperature)}</Text>
              </View>
              {client.docs_received && <Text style={styles.docsTag}>📄 Docs ✓</Text>}
              {client.sold && <Text style={styles.soldTag}>✅ Vendido</Text>}
            </View>
          </View>
        </View>
      </View>

      {/* AI Strip */}
      <View style={styles.iaStrip}>
        <Text style={styles.iaTitle}>✦ SUGERENCIA IA</Text>
        {cargandoIA ? (
          <Text style={styles.iaText}>Analizando historial...</Text>
        ) : (
          <>
            <Text style={styles.iaText}>{sugerencia}</Text>
            {mensajeIA ? (
              <>
                <View style={styles.iaDivider} />
                <Text style={styles.iaMensajeLabel}>MENSAJE LISTO PARA WHATSAPP</Text>
                <Text style={styles.iaMensaje}>{mensajeIA}</Text>
                <TouchableOpacity style={styles.iaCopyBtn} onPress={copiarMensaje}>
                  <Text style={styles.iaCopyText}>{copiado ? '✅ Copiado' : '📋 Copiar mensaje'}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        {[
          { icon:'📞', label:'Llamé',      color:T.green,  bg:T.greenDim, onPress: () => registrarContacto('call', 'Llamada realizada') },
          { icon:'💬', label:'WA enviado', color:T.accent, bg:T.accentDim, onPress: () => registrarContacto('whatsapp', 'WhatsApp enviado') },
          { icon:'📵', label:'No atendió', color:T.red,    bg:T.redDim,   onPress: () => registrarContacto('call', 'Llamada — no contestó') },
          { icon:'📝', label:'Nota',       color:T.blue,   bg:T.blueDim,  onPress: () => setModalNota(true) },
        ].map(a => (
          <TouchableOpacity key={a.label} style={[styles.qaBtn, { backgroundColor: a.bg }]} onPress={a.onPress}>
            <Text style={styles.qaIcon}>{a.icon}</Text>
            <Text style={[styles.qaLabel, { color: a.color }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Secondary actions */}
      <View style={styles.secondActions}>
        <TouchableOpacity style={styles.secBtn} onPress={abrirWhatsApp}>
          <Text style={[styles.secBtnText, { color: '#25D366' }]}>💬 Abrir WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secBtn} onPress={llamar}>
          <Text style={[styles.secBtnText, { color: T.green }]}>📞 Llamar</Text>
        </TouchableOpacity>
        {!client.sold && (
          <TouchableOpacity style={[styles.secBtn, { backgroundColor: T.accentDim, borderColor: T.accent + '44' }]} onPress={marcarVendido}>
            <Text style={[styles.secBtnText, { color: T.accentText }]}>🏆 Vendido</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['info','historial'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, { color: tab === t ? T.accent : T.muted }]}>
              {t === 'info' ? 'Info' : 'Historial'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        nestedScrollEnabled={true}
      >
        {tab === 'info' && (
          <>
            <View style={styles.infoCard}>
              {[
                { label: 'Teléfono',    value: client.phone },
                { label: 'Vehículo',    value: client.vehicle_interest },
                { label: 'Presupuesto', value: formatDual(client.budget), accent: true },
                { label: 'Trabajo',     value: client.job },
                { label: 'Cumpleaños',  value: client.birthday },
                { label: 'Club',        value: client.club },
                { label: 'Notas',       value: client.notes },
                { label: 'Contactos',   value: `${client.contact_count} realizados` },
              ].filter(r => r.value).map((r, i, arr) => (
                <View key={r.label} style={[styles.infoRow, i === arr.length-1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={[styles.infoValue, r.accent && { color: T.accentText }]}>{r.value}</Text>
                </View>
              ))}
            </View>

            {!client.sold && (
              <>
                <Text style={styles.sectionLabel}>TEMPERATURA</Text>
                <View style={styles.tempRow}>
                  {(['hot','warm','cold'] as const).map(t => (
                    <TouchableOpacity key={t} onPress={() => cambiarTemp(t)}
                      style={[styles.tempBtn, {
                        backgroundColor: client.temperature === t ? tempColor(t) : tempDim(t),
                        borderColor: tempColor(t) + '80',
                      }]}>
                      <Text style={[styles.tempBtnText, { color: client.temperature === t ? '#fff' : tempTextColor(t) }]}>
                        {tempLabel(t)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {tab === 'historial' && (
          <>
            {interactions.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Sin interacciones todavía</Text>
                <Text style={styles.emptySub}>Usá los botones de arriba para registrar contacto</Text>
              </View>
            ) : interactions.map(i => (
              <View key={i.id} style={styles.interactionCard}>
                <Text style={styles.interactionIcon}>{iconFor(i.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.interactionContent}>{i.content}</Text>
                  <Text style={styles.interactionDate}>{new Date(i.created_at).toLocaleString('es-PY')}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={modalNota} animationType='slide' transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Agregar nota</Text>
            <TextInput
              style={styles.notaInput}
              placeholder="¿Qué pasó en este contacto?"
              placeholderTextColor={T.muted}
              value={nota}
              onChangeText={setNota}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalNota(false)}>
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarNota} disabled={guardando}>
                <Text style={styles.btnGuardarText}>{guardando ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: T.bg },
  loading:            { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  header:             { padding: 20, paddingTop: 60, backgroundColor: T.white, borderBottomWidth: 0.5, borderBottomColor: T.border },
  headerTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  back:               { color: T.accent, fontSize: 14, fontWeight: '700' },
  editBtn:            { color: T.muted, fontSize: 13, fontWeight: '600' },
  profileRow:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:             { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText:         { color: '#fff', fontSize: 18, fontWeight: '800' },
  clientName:         { color: T.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  badgeRow:           { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
  badge:              { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:          { fontSize: 11, fontWeight: '700' },
  docsTag:            { color: T.green, fontSize: 11, fontWeight: '700' },
  soldTag:            { color: T.green, fontSize: 11, fontWeight: '700' },
  iaStrip:            { margin: 12, backgroundColor: T.accentDim, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: T.accent + '55' },
  iaTitle:            { color: T.accentText, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  iaText:             { color: T.accentText, fontSize: 13, lineHeight: 20 },
  iaDivider:          { height: 0.5, backgroundColor: T.accent + '44', marginVertical: 10 },
  iaMensajeLabel:     { color: T.accentText, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  iaMensaje:          { color: T.accentDark, fontSize: 12, lineHeight: 20, fontStyle: 'italic' },
  iaCopyBtn:          { backgroundColor: T.accent, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  iaCopyText:         { color: '#fff', fontSize: 12, fontWeight: '800' },
  quickActions:       { flexDirection: 'row', padding: 12, paddingBottom: 6, gap: 8 },
  qaBtn:              { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12 },
  qaIcon:             { fontSize: 18 },
  qaLabel:            { fontSize: 9, fontWeight: '700', marginTop: 3 },
  secondActions:      { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 8, borderBottomWidth: 0.5, borderBottomColor: T.border },
  secBtn:             { flex: 1, backgroundColor: T.white, borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 0.5, borderColor: T.border },
  secBtnText:         { fontSize: 11, fontWeight: '700' },
  tabs:               { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: T.border, backgroundColor: T.white },
  tabBtn:             { flex: 1, padding: 12, alignItems: 'center' },
  tabBtnActive:       { borderBottomWidth: 2, borderBottomColor: T.accent },
  tabText:            { fontSize: 13, fontWeight: '600' },
  scroll:             { flex: 1 },
  infoCard:           { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 0.5, borderColor: T.border },
  infoRow:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: T.border },
  infoLabel:          { color: T.muted, fontSize: 12 },
  infoValue:          { color: T.text, fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  sectionLabel:       { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  tempRow:            { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tempBtn:            { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  tempBtnText:        { fontSize: 12, fontWeight: '700' },
  interactionCard:    { flexDirection: 'row', gap: 12, backgroundColor: T.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: T.border },
  interactionIcon:    { fontSize: 18 },
  interactionContent: { color: T.textSub, fontSize: 13 },
  interactionDate:    { color: T.muted, fontSize: 11, marginTop: 4 },
  empty:              { alignItems: 'center', marginTop: 40 },
  emptyText:          { color: T.text, fontSize: 14, fontWeight: '700' },
  emptySub:           { color: T.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:          { backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitulo:        { color: T.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  notaInput:          { backgroundColor: T.bg, borderRadius: 10, padding: 12, color: T.text, fontSize: 14, borderWidth: 0.5, borderColor: T.border, minHeight: 100, textAlignVertical: 'top' },
  modalBtns:          { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancelar:        { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText:    { color: T.muted, fontWeight: '700' },
  btnGuardar:         { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.accent },
  btnGuardarText:     { color: '#fff', fontWeight: '800' },
})