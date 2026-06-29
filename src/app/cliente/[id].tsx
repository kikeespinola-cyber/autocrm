import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { Client, Interaction } from '../../lib/types'
import { supabase } from '../../lib/supabase'
import { generarSugerencia } from '../../lib/ia'
import { useTipoCambio } from '../../hooks/useTipoCambio'

const tempColor = (t: string) => t === 'hot' ? '#FF4444' : t === 'warm' ? '#F0A020' : '#4A8AE8'
const tempLabel = (t: string) => t === 'hot' ? '🔴 Hot' : t === 'warm' ? '🟡 Warm' : '🔵 Cold'
const tempDim   = (t: string) => t === 'hot' ? '#2A0808' : t === 'warm' ? '#2A1A00' : '#0A1428'
const iconFor   = (t: string) => ({ call:'📞', whatsapp:'💬', visit:'🏢', note:'📝', lead:'🌐', sale:'✅' }[t] || '📝')

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

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
    const { data: i } = await supabase.from('interactions').select('*').eq('client_id', id).order('created_at', { ascending: false })
    if (c) {
      setClient(c)
      cargarSugerencia(c, i || [])
    }
    if (i) setInteractions(i)
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
    setClient(prev => prev ? { ...prev, temperature: t as any } : prev)
  }

  async function marcarVendido() {
    Alert.alert('Marcar como vendido', '¿Confirmás que se cerró esta venta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        await supabase.from('clients').update({ sold: true, sale_date: new Date().toISOString().split('T')[0] }).eq('id', id)
        await supabase.from('interactions').insert({ client_id: id, type: 'sale', content: '✅ Venta cerrada' })
        setClient(prev => prev ? { ...prev, sold: true } : prev)
        Alert.alert('¡Venta cerrada!', '🎉 Movido a Post-venta')
      }}
    ])
  }

  async function guardarNota() {
    if (!nota.trim()) return
    setGuardando(true)
    await supabase.from('interactions').insert({ client_id: id, type: 'note', content: nota.trim() })
    await supabase.from('clients').update({ last_contact_at: new Date().toISOString(), contact_count: (client?.contact_count || 0) + 1 }).eq('id', id)
    setNota('')
    setModalNota(false)
    setGuardando(false)
    await cargar()
  }

  function abrirWhatsApp() {
    const phone = client?.phone?.replace(/\D/g, '') || ''
    if (typeof window !== 'undefined') window.open(`https://wa.me/595${phone}`, '_blank')
  }

  function llamar() {
    const phone = client?.phone || ''
    if (typeof window !== 'undefined') window.open(`tel:${phone}`)
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
      <Text style={{ color: '#F0A020' }}>Cargando...</Text>
    </View>
  )

  return (
    <View style={styles.container}>
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{client.name.slice(0,2).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.clientName}>{client.name}</Text>
            <View style={styles.badgeRow}>
              <Text style={[styles.badge, { color: tempColor(client.temperature), backgroundColor: tempDim(client.temperature) }]}>
                {tempLabel(client.temperature)}
              </Text>
              {client.docs_received && <Text style={styles.docsTag}>📄 Docs ✓</Text>}
              {client.sold && <Text style={styles.soldTag}>✅ Vendido</Text>}
            </View>
          </View>
        </View>
      </View>

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

      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.qaBtn, { backgroundColor: '#082A18' }]} onPress={() => registrarContacto('call', 'Llamada realizada')}>
          <Text style={styles.qaIcon}>📞</Text>
          <Text style={[styles.qaLabel, { color: '#22C97A' }]}>Llamé</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.qaBtn, { backgroundColor: '#082210' }]} onPress={() => registrarContacto('whatsapp', 'WhatsApp enviado')}>
          <Text style={styles.qaIcon}>💬</Text>
          <Text style={[styles.qaLabel, { color: '#25D366' }]}>WA enviado</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.qaBtn, { backgroundColor: '#2A0808' }]} onPress={() => registrarContacto('call', 'Llamada — no contestó')}>
          <Text style={styles.qaIcon}>📵</Text>
          <Text style={[styles.qaLabel, { color: '#FF4444' }]}>No contestó</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.qaBtn, { backgroundColor: '#0A1428' }]} onPress={() => setModalNota(true)}>
          <Text style={styles.qaIcon}>📝</Text>
          <Text style={[styles.qaLabel, { color: '#4A8AE8' }]}>Nota</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.secondActions}>
        <TouchableOpacity style={styles.waBtn} onPress={abrirWhatsApp}>
          <Text style={styles.waBtnText}>💬 Abrir WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.llamarBtn} onPress={llamar}>
          <Text style={styles.llamarBtnText}>📞 Llamar</Text>
        </TouchableOpacity>
        {!client.sold && (
          <TouchableOpacity style={styles.vendidoBtn} onPress={marcarVendido}>
            <Text style={styles.vendidoBtnText}>🏆 Vendido</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {(['info','historial'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'info' ? 'Info' : 'Historial'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {tab === 'info' && (
          <>
            <View style={styles.infoCard}>
              {[
                { label: 'Teléfono',    value: client.phone },
                { label: 'Vehículo',    value: client.vehicle_interest },
                { label: 'Presupuesto', value: formatDual(client.budget) },
                { label: 'Trabajo',     value: client.job },
                { label: 'Cumpleaños',  value: client.birthday },
                { label: 'Club',        value: client.club },
                { label: 'Notas',       value: client.notes },
                { label: 'Contactos',   value: `${client.contact_count} realizados` },
              ].filter(r => r.value).map(r => (
                <View key={r.label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={styles.infoValue}>{r.value}</Text>
                </View>
              ))}
            </View>
            {!client.sold && (
              <>
                <Text style={styles.sectionLabel}>TEMPERATURA</Text>
                <View style={styles.tempRow}>
                  {(['hot','warm','cold'] as const).map(t => (
                    <TouchableOpacity key={t} onPress={() => cambiarTemp(t)}
                      style={[styles.tempBtn, { backgroundColor: client.temperature === t ? tempColor(t) : tempDim(t), borderColor: tempColor(t) }]}>
                      <Text style={[styles.tempBtnText, { color: client.temperature === t ? '#fff' : tempColor(t) }]}>
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
                <View style={styles.interactionInfo}>
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
              placeholderTextColor='#55556A'
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
  container:          { flex: 1, backgroundColor: '#0A0A0F' },
  loading:            { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' },
  header:             { padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#252535' },
  headerTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  back:               { color: '#F0A020', fontSize: 14, fontWeight: '700' },
  editBtn:            { color: '#55556A', fontSize: 13, fontWeight: '600' },
  profileRow:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:             { width: 52, height: 52, borderRadius: 26, backgroundColor: '#7B3FE4', alignItems: 'center', justifyContent: 'center' },
  avatarText:         { color: '#fff', fontSize: 18, fontWeight: '800' },
  clientName:         { color: '#EEEEF5', fontSize: 18, fontWeight: '800' },
  badgeRow:           { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
  badge:              { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  docsTag:            { color: '#22C97A', fontSize: 11, fontWeight: '700' },
  soldTag:            { color: '#22C97A', fontSize: 11, fontWeight: '700' },
  iaStrip:            { margin: 12, backgroundColor: '#1A0A38', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#8B5CF644' },
  iaTitle:            { color: '#8B5CF6', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  iaText:             { color: '#AAAABF', fontSize: 13, lineHeight: 20 },
  iaDivider:          { height: 1, backgroundColor: '#252535', marginVertical: 10 },
  iaMensajeLabel:     { color: '#8B5CF6', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  iaMensaje:          { color: '#EEEEF5', fontSize: 12, lineHeight: 20, fontStyle: 'italic' },
  iaCopyBtn:          { backgroundColor: '#252535', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  iaCopyText:         { color: '#F0A020', fontSize: 12, fontWeight: '700' },
  quickActions:       { flexDirection: 'row', padding: 12, paddingBottom: 6, gap: 8 },
  qaBtn:              { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12 },
  qaIcon:             { fontSize: 18 },
  qaLabel:            { fontSize: 9, fontWeight: '700', marginTop: 3 },
  secondActions:      { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#252535' },
  waBtn:              { flex: 1, backgroundColor: '#082210', borderRadius: 10, padding: 8, alignItems: 'center' },
  waBtnText:          { color: '#25D366', fontSize: 11, fontWeight: '700' },
  llamarBtn:          { flex: 1, backgroundColor: '#082A18', borderRadius: 10, padding: 8, alignItems: 'center' },
  llamarBtnText:      { color: '#22C97A', fontSize: 11, fontWeight: '700' },
  vendidoBtn:         { flex: 1, backgroundColor: '#2A1A00', borderRadius: 10, padding: 8, alignItems: 'center' },
  vendidoBtnText:     { color: '#F0A020', fontSize: 11, fontWeight: '700' },
  tabs:               { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#252535' },
  tabBtn:             { flex: 1, padding: 12, alignItems: 'center' },
  tabBtnActive:       { borderBottomWidth: 2, borderBottomColor: '#F0A020' },
  tabText:            { color: '#55556A', fontSize: 13, fontWeight: '600' },
  tabTextActive:      { color: '#F0A020' },
  scroll:             { flex: 1 },
  infoCard:           { backgroundColor: '#1A1A24', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#252535' },
  infoRow:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#252535' },
  infoLabel:          { color: '#55556A', fontSize: 12 },
  infoValue:          { color: '#EEEEF5', fontSize: 13, fontWeight: '500' },
  sectionLabel:       { color: '#55556A', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  tempRow:            { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tempBtn:            { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  tempBtnText:        { fontSize: 12, fontWeight: '700' },
  interactionCard:    { flexDirection: 'row', gap: 12, backgroundColor: '#1A1A24', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#252535' },
  interactionIcon:    { fontSize: 18 },
  interactionInfo:    { flex: 1 },
  interactionContent: { color: '#AAAABF', fontSize: 13 },
  interactionDate:    { color: '#55556A', fontSize: 11, marginTop: 4 },
  empty:              { alignItems: 'center', marginTop: 40 },
  emptyText:          { color: '#EEEEF5', fontSize: 14, fontWeight: '700' },
  emptySub:           { color: '#55556A', fontSize: 12, marginTop: 6, textAlign: 'center' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:          { backgroundColor: '#13131A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitulo:        { color: '#EEEEF5', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  notaInput:          { backgroundColor: '#1A1A24', borderRadius: 10, padding: 12, color: '#EEEEF5', fontSize: 14, borderWidth: 1, borderColor: '#252535', minHeight: 100, textAlignVertical: 'top' },
  modalBtns:          { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancelar:        { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#1A1A24', borderWidth: 1, borderColor: '#252535' },
  btnCancelarText:    { color: '#55556A', fontWeight: '700' },
  btnGuardar:         { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F0A020' },
  btnGuardarText:     { color: '#0A0A0F', fontWeight: '800' },
})