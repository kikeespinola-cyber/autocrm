import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { useToast } from '../components/Toast'
import { mensajeError } from '../lib/errores'

const NEGRO = '#1A1A2E'

const REDES = [
  { key: 'facebook',  label: 'Facebook',  icon: 'logo-facebook',  color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E1306C' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: 'logo-whatsapp',  color: '#25D366' },
  { key: 'tiktok',    label: 'TikTok',    icon: 'musical-notes',  color: '#111111' },
]

export default function PautasScreen() {
  const { mostrarToast } = useToast()
  const [pautas, setPautas]           = useState<any[]>([])
  const [modal, setModal]             = useState(false)
  const [guardando, setGuardando]     = useState(false)
  const [vehiculo, setVehiculo]       = useState('')
  const [red, setRed]                 = useState<string | null>(null)
  const [inversion, setInversion]     = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin]       = useState('')
  const [consultas, setConsultas]     = useState('')
  const [ventas, setVentas]           = useState('')
  const [notas, setNotas]             = useState('')
  const [editandoId, setEditandoId]   = useState<string | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('pautas')
      .select('*')
      .eq('user_id', user?.id)
      .order('fecha_inicio', { ascending: false })
    if (data) setPautas(data)
  }

  function limpiar() {
    setVehiculo(''); setRed(null); setInversion(''); setFechaInicio('')
    setFechaFin(''); setConsultas(''); setVentas(''); setNotas(''); setEditandoId(null)
  }

  function abrirEditar(p: any) {
    setVehiculo(p.vehiculo)
    setRed(p.red)
    setInversion(String(p.inversion))
    setFechaInicio(p.fecha_inicio)
    setFechaFin(p.fecha_fin || '')
    setConsultas(String(p.consultas))
    setVentas(String(p.ventas))
    setNotas(p.notas || '')
    setEditandoId(p.id)
    setModal(true)
  }

  function parseFecha(f: string): string {
    if (!f) return ''
    if (f.includes('/')) {
      const p = f.split('/')
      const dia = p[0].padStart(2, '0')
      const mes = p[1].padStart(2, '0')
      const anio = p[2] ? p[2] : new Date().getFullYear().toString()
      return `${anio}-${mes}-${dia}`
    }
    return f
  }

  async function guardar() {
    if (!vehiculo.trim() || !red || !inversion || !fechaInicio) {
      mostrarToast('Completá vehículo, red, inversión y fecha', 'error')
      return
    }
    const inv = parseInt(inversion)
    if (isNaN(inv) || inv < 0) {
      mostrarToast('La inversión debe ser un número válido', 'error')
      return
    }
    if (consultas && (isNaN(parseInt(consultas)) || parseInt(consultas) < 0)) {
      mostrarToast('Las consultas deben ser un número válido', 'error')
      return
    }
    if (ventas && (isNaN(parseInt(ventas)) || parseInt(ventas) < 0)) {
      mostrarToast('Las ventas deben ser un número válido', 'error')
      return
    }
    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        user_id:      user?.id,
        vehiculo:     vehiculo.trim(),
        red,
        inversion:    parseInt(inversion) || 0,
        fecha_inicio: parseFecha(fechaInicio),
        fecha_fin:    fechaFin ? parseFecha(fechaFin) : null,
        consultas:    parseInt(consultas) || 0,
        ventas:       parseInt(ventas) || 0,
        notas:        notas.trim() || null,
      }
      if (editandoId) {
        await supabase.from('pautas').update(payload).eq('id', editandoId)
      } else {
        await supabase.from('pautas').insert(payload)
      }
      limpiar(); setModal(false); await cargar()
      mostrarToast(editandoId ? 'Pauta actualizada' : 'Pauta registrada', 'success')
    } catch (e) {
      mostrarToast(mensajeError(e), 'error')
    } finally {
      setGuardando(false)
    }
  }

  function eliminar(id: string) {
    Alert.alert(
      '¿Eliminar esta pauta?',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('pautas').delete().eq('id', id)
            await cargar()
          },
        },
      ]
    )
  }

  const totalInvertido = pautas.reduce((a, p) => a + (p.inversion || 0), 0)
  const totalConsultas = pautas.reduce((a, p) => a + (p.consultas || 0), 0)
  const totalVentas    = pautas.reduce((a, p) => a + (p.ventas || 0), 0)
  const costoPorLead   = totalConsultas > 0 ? Math.round(totalInvertido / totalConsultas) : 0
  const costoPorVenta  = totalVentas > 0 ? Math.round(totalInvertido / totalVentas) : 0

  function formatGs(n: number) {
    return 'Gs. ' + n.toLocaleString('es-PY')
  }

  function redInfo(key: string) {
    return REDES.find(r => r.key === key)
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>Pautas</Text>
        <Text style={styles.sub}>Medí el retorno de tu inversión en redes</Text>

        <View style={styles.statsGrid}>
          {[
            { label: 'Total invertido', value: formatGs(totalInvertido), color: T.red,   icon: 'wallet-outline' },
            { label: 'Consultas',       value: String(totalConsultas),   color: T.blue,  icon: 'chatbubbles-outline' },
            { label: 'Ventas',          value: String(totalVentas),      color: T.green, icon: 'trophy-outline' },
            { label: 'Costo por lead',  value: formatGs(costoPorLead),   color: T.warm,  icon: 'pricetag-outline' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon as any} size={16} color={s.color} style={{ marginBottom: 7 }} />
              <Text style={[styles.statNum, { color: s.color }]} numberOfLines={1} adjustsFontSizeToFit>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {costoPorVenta > 0 && (
          <View style={styles.roiCard}>
            <View style={styles.roiHeader}>
              <Ionicons name="cash" size={16} color={T.accentText} />
              <Text style={styles.roiLabel}>Costo por venta cerrada</Text>
            </View>
            <Text style={styles.roiNum}>{formatGs(costoPorVenta)}</Text>
            <Text style={styles.roiSub}>Inversión total dividida entre ventas generadas por pautas</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>TUS PAUTAS</Text>
        {pautas.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={40} color={T.muted} />
            <Text style={styles.emptyText}>Sin pautas registradas</Text>
            <Text style={styles.emptySub}>Tocá el + para registrar tu primera pauta</Text>
          </View>
        ) : pautas.map(p => {
          const info = redInfo(p.red)
          const conv = p.consultas > 0 ? Math.round((p.ventas / p.consultas) * 100) : 0
          return (
            <View key={p.id} style={styles.card}>
              <View style={[styles.strip, { backgroundColor: info?.color || T.muted }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardVehiculo} numberOfLines={1}>{p.vehiculo}</Text>
                    <View style={styles.cardMeta}>
                      {info && <Ionicons name={info.icon as any} size={12} color={info.color} />}
                      <Text style={[styles.cardRed, { color: info?.color || T.muted }]}>{info?.label || p.red}</Text>
                      <Text style={styles.cardSep}>·</Text>
                      <Text style={styles.cardFecha}>
                        {p.fecha_inicio}{p.fecha_fin ? ` → ${p.fecha_fin}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 7 }}>
                    <Text style={styles.cardInversion}>{formatGs(p.inversion)}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity onPress={() => abrirEditar(p)} style={styles.iconBtn}>
                        <Ionicons name="create-outline" size={15} color={T.textSub} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => eliminar(p.id)} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={15} color={T.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.cardStats}>
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatNum, { color: T.blue }]}>{p.consultas}</Text>
                    <Text style={styles.cardStatLabel}>Consultas</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatNum, { color: T.green }]}>{p.ventas}</Text>
                    <Text style={styles.cardStatLabel}>Ventas</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatNum, { color: T.warm }]} numberOfLines={1} adjustsFontSizeToFit>
                      {p.consultas > 0 ? formatGs(Math.round(p.inversion / p.consultas)) : '—'}
                    </Text>
                    <Text style={styles.cardStatLabel}>Por lead</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatNum, { color: NEGRO }]}>
                      {p.consultas > 0 ? `${conv}%` : '—'}
                    </Text>
                    <Text style={styles.cardStatLabel}>Conversión</Text>
                  </View>
                </View>

                {p.notas ? (
                  <View style={styles.notasRow}>
                    <Ionicons name="document-text-outline" size={12} color={T.muted} />
                    <Text style={styles.cardNotas}>{p.notas}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => { limpiar(); setModal(true) }} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitulo}>{editandoId ? 'Editar pauta' : 'Nueva pauta'}</Text>

              <Text style={styles.inputLabel}>Vehículo *</Text>
              <TextInput style={styles.input} placeholder="Ej: Toyota Hilux GR-S 2024" placeholderTextColor={T.muted} value={vehiculo} onChangeText={setVehiculo} />

              <Text style={styles.inputLabel}>Red social *</Text>
              <View style={styles.chipsWrap}>
                {REDES.map(r => {
                  const sel = red === r.key
                  return (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => setRed(sel ? null : r.key)}
                      style={[styles.chip, sel && { backgroundColor: r.color, borderColor: r.color }]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={r.icon as any} size={14} color={sel ? '#fff' : r.color} />
                      <Text style={[styles.chipText, sel && { color: '#fff' }]}>{r.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Text style={styles.inputLabel}>Inversión (Gs.) *</Text>
              <View style={styles.inputIconWrap}>
                <Ionicons name="wallet-outline" size={16} color={T.muted} />
                <TextInput style={styles.inputIcon} placeholder="150000" placeholderTextColor={T.muted} value={inversion} onChangeText={setInversion} keyboardType="numeric" />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Inicio *</Text>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="calendar-outline" size={15} color={T.muted} />
                    <TextInput style={styles.inputIcon} placeholder="01/07/2026" placeholderTextColor={T.muted} value={fechaInicio} onChangeText={setFechaInicio} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Fin</Text>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="calendar-outline" size={15} color={T.muted} />
                    <TextInput style={styles.inputIcon} placeholder="15/07/2026" placeholderTextColor={T.muted} value={fechaFin} onChangeText={setFechaFin} />
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Consultas</Text>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="chatbubbles-outline" size={15} color={T.muted} />
                    <TextInput style={styles.inputIcon} placeholder="0" placeholderTextColor={T.muted} value={consultas} onChangeText={setConsultas} keyboardType="numeric" />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Ventas</Text>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="trophy-outline" size={15} color={T.muted} />
                    <TextInput style={styles.inputIcon} placeholder="0" placeholderTextColor={T.muted} value={ventas} onChangeText={setVentas} keyboardType="numeric" />
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Notas</Text>
              <TextInput
                style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                placeholder="Observaciones de la pauta..."
                placeholderTextColor={T.muted}
                value={notas}
                onChangeText={setNotas}
                multiline
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => { limpiar(); setModal(false) }}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={guardando}>
                  {guardando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnGuardarText}>
                      {editandoId ? 'Guardar cambios' : 'Registrar pauta'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: T.bg },
  content:         { padding: 20, paddingTop: 24, paddingBottom: 110 },

  titulo:          { color: NEGRO, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  sub:             { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 20, fontWeight: '500' },

  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statCard:        { width: '48.5%', backgroundColor: T.white, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: T.border },
  statNum:         { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  statLabel:       { color: T.muted, fontSize: 11, marginTop: 3, fontWeight: '500' },

  roiCard:         { backgroundColor: T.accentDim, borderRadius: 16, padding: 17, marginBottom: 22, borderWidth: 0.5, borderColor: T.accent + '44' },
  roiHeader:       { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  roiLabel:        { color: T.accentText, fontSize: 12.5, fontWeight: '700' },
  roiNum:          { color: T.accentText, fontSize: 25, fontWeight: '800', letterSpacing: -0.6 },
  roiSub:          { color: T.accentDark, fontSize: 11, marginTop: 4 },

  sectionLabel:    { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 11 },

  card:            { backgroundColor: T.white, borderRadius: 16, marginBottom: 10, borderWidth: 0.5, borderColor: T.border, flexDirection: 'row', overflow: 'hidden' },
  strip:           { width: 4 },
  cardBody:        { flex: 1, padding: 14 },
  cardHeader:      { flexDirection: 'row', marginBottom: 13, gap: 10 },
  cardVehiculo:    { color: NEGRO, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  cardMeta:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' },
  cardRed:         { fontSize: 11.5, fontWeight: '600' },
  cardSep:         { color: T.muted, fontSize: 11 },
  cardFecha:       { color: T.muted, fontSize: 11 },
  cardInversion:   { color: T.red, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  iconBtn:         { width: 30, height: 30, borderRadius: 15, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },

  cardStats:       { flexDirection: 'row', gap: 7 },
  cardStat:        { flex: 1, backgroundColor: T.bg, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  cardStatNum:     { fontSize: 13.5, fontWeight: '800' },
  cardStatLabel:   { color: T.muted, fontSize: 9, marginTop: 3, fontWeight: '600' },

  notasRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 11 },
  cardNotas:       { color: T.muted, fontSize: 11.5, fontStyle: 'italic', flex: 1 },

  empty:           { alignItems: 'center', marginTop: 60, gap: 9 },
  emptyText:       { color: NEGRO, fontSize: 16, fontWeight: '700' },
  emptySub:        { color: T.muted, fontSize: 13 },

  fab:             { position: 'absolute', bottom: 26, right: 22, width: 58, height: 58, borderRadius: 29, backgroundColor: NEGRO, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },

  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: T.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 12, paddingBottom: 40 },
  modalHandle:     { width: 38, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 18 },
  modalTitulo:     { color: NEGRO, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },

  inputLabel:      { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 7, marginTop: 14 },
  input:           { backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: NEGRO, fontSize: 14, borderWidth: 0.5, borderColor: T.border },
  inputIconWrap:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 13, borderWidth: 0.5, borderColor: T.border },
  inputIcon:       { flex: 1, paddingVertical: 13, color: NEGRO, fontSize: 14 },

  chipsWrap:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
  chipText:        { fontSize: 12, fontWeight: '600', color: T.textSub },

  modalBtns:       { flexDirection: 'row', gap: 10, marginTop: 26 },
  btnCancelar:     { flex: 1, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText: { color: T.textSub, fontWeight: '700', fontSize: 14 },
  btnGuardar:      { flex: 1.4, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: NEGRO },
  btnGuardarText:  { color: '#fff', fontWeight: '800', fontSize: 14 },
})
