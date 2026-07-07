import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

const REDES = [
  { key: 'facebook',  label: '📘 Facebook',  color: '#1877F2' },
  { key: 'instagram', label: '📸 Instagram', color: '#E1306C' },
  { key: 'whatsapp',  label: '💬 WhatsApp',  color: '#25D366' },
  { key: 'tiktok',    label: '🎵 TikTok',    color: '#000000' },
]

export default function PautasScreen() {
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
      Alert.alert('Error', 'Completá vehículo, red, inversión y fecha de inicio')
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
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: string) {
    const ok = typeof window !== 'undefined' ? window.confirm('¿Eliminar esta pauta?') : false
    if (!ok) return
    await supabase.from('pautas').delete().eq('id', id)
    await cargar()
  }

  // Stats globales
  const totalInvertido = pautas.reduce((a, p) => a + (p.inversion || 0), 0)
  const totalConsultas = pautas.reduce((a, p) => a + (p.consultas || 0), 0)
  const totalVentas    = pautas.reduce((a, p) => a + (p.ventas || 0), 0)
  const costoPorLead   = totalConsultas > 0 ? Math.round(totalInvertido / totalConsultas) : 0
  const costoPorVenta  = totalVentas > 0 ? Math.round(totalInvertido / totalVentas) : 0

  function formatGs(n: number) {
    return 'Gs. ' + n.toLocaleString('es-PY')
  }

  function redColor(key: string) {
    return REDES.find(r => r.key === key)?.color || T.accent
  }

  function redLabel(key: string) {
    return REDES.find(r => r.key === key)?.label || key
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Estadísticas de pautas</Text>
        <Text style={styles.sub}>Medí el retorno de tu inversión en redes</Text>

        {/* Resumen */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total invertido',   value: formatGs(totalInvertido), color: T.red },
            { label: 'Consultas',         value: String(totalConsultas),   color: T.blue },
            { label: 'Ventas cerradas',   value: String(totalVentas),      color: T.green },
            { label: 'Costo por lead',    value: formatGs(costoPorLead),   color: T.warm },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {costoPorVenta > 0 && (
          <View style={styles.roiCard}>
            <Text style={styles.roiLabel}>💰 Costo por venta cerrada</Text>
            <Text style={styles.roiNum}>{formatGs(costoPorVenta)}</Text>
            <Text style={styles.roiSub}>Inversión total dividida entre ventas generadas por pautas</Text>
          </View>
        )}

        {/* Lista de pautas */}
        <Text style={styles.sectionLabel}>TUS PAUTAS</Text>
        {pautas.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 32 }}>📢</Text>
            <Text style={styles.emptyText}>Sin pautas registradas</Text>
            <Text style={styles.emptySub}>Tocá el + para registrar tu primera pauta</Text>
          </View>
        ) : pautas.map(p => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardVehiculo}>{p.vehiculo}</Text>
                <Text style={[styles.cardRed, { color: redColor(p.red) }]}>{redLabel(p.red)}</Text>
                <Text style={styles.cardFecha}>
                  {p.fecha_inicio} {p.fecha_fin ? `→ ${p.fecha_fin}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.cardInversion, { color: T.red }]}>{formatGs(p.inversion)}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => abrirEditar(p)}>
                    <Text style={{ fontSize: 16 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => eliminar(p.id)}>
                    <Text style={{ fontSize: 16 }}>🗑️</Text>
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
                <Text style={[styles.cardStatNum, { color: T.warm }]}>
                  {p.consultas > 0 ? formatGs(Math.round(p.inversion / p.consultas)) : '—'}
                </Text>
                <Text style={styles.cardStatLabel}>Por lead</Text>
              </View>
              <View style={styles.cardStat}>
                <Text style={[styles.cardStatNum, { color: T.accent }]}>
                  {p.ventas > 0 ? `${Math.round((p.ventas / p.consultas) * 100)}%` : '—'}
                </Text>
                <Text style={styles.cardStatLabel}>Conversión</Text>
              </View>
            </View>

            {p.notas ? <Text style={styles.cardNotas}>{p.notas}</Text> : null}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => { limpiar(); setModal(true) }}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitulo}>{editandoId ? 'Editar pauta' : 'Nueva pauta'}</Text>

              <Text style={styles.inputLabel}>Vehículo *</Text>
              <TextInput style={styles.input} placeholder="Ej: Toyota Hilux GR-S 2024" placeholderTextColor={T.muted} value={vehiculo} onChangeText={setVehiculo} />

              <Text style={styles.inputLabel}>Red social *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {REDES.map(r => (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setRed(red === r.key ? null : r.key)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: red === r.key ? r.color : T.bg, borderWidth: 1, borderColor: r.color + '80' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: red === r.key ? '#fff' : r.color }}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Inversión (Gs.) *</Text>
              <TextInput style={styles.input} placeholder="Ej: 150000" placeholderTextColor={T.muted} value={inversion} onChangeText={setInversion} keyboardType="numeric" />

              <Text style={styles.inputLabel}>Fecha inicio * (DD/MM/AAAA)</Text>
              <TextInput style={styles.input} placeholder="Ej: 01/07/2026" placeholderTextColor={T.muted} value={fechaInicio} onChangeText={setFechaInicio} />

              <Text style={styles.inputLabel}>Fecha fin (opcional)</Text>
              <TextInput style={styles.input} placeholder="Ej: 15/07/2026" placeholderTextColor={T.muted} value={fechaFin} onChangeText={setFechaFin} />

              <Text style={styles.inputLabel}>Consultas recibidas</Text>
              <TextInput style={styles.input} placeholder="¿Cuántas personas consultaron?" placeholderTextColor={T.muted} value={consultas} onChangeText={setConsultas} keyboardType="numeric" />

              <Text style={styles.inputLabel}>Ventas cerradas</Text>
              <TextInput style={styles.input} placeholder="¿Cuántas ventas generó esta pauta?" placeholderTextColor={T.muted} value={ventas} onChangeText={setVentas} keyboardType="numeric" />

              <Text style={styles.inputLabel}>Notas (opcional)</Text>
              <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Observaciones de la pauta..." placeholderTextColor={T.muted} value={notas} onChangeText={setNotas} multiline />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => { limpiar(); setModal(false) }}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={guardando}>
                  <Text style={styles.btnGuardarText}>{guardando ? 'Guardando...' : 'Guardar'}</Text>
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
  container:      { flex: 1, backgroundColor: T.bg },
  content:        { padding: 20, paddingTop: 60, paddingBottom: 100 },
  titulo:         { color: T.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sub:            { color: T.muted, fontSize: 12, marginTop: 4, marginBottom: 20, fontWeight: '500' },
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard:       { width: '48%', backgroundColor: T.white, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: T.border },
  statNum:        { fontSize: 16, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:      { color: T.muted, fontSize: 11, marginTop: 3, fontWeight: '500' },
  roiCard:        { backgroundColor: T.accentDim, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 0.5, borderColor: T.accent + '44' },
  roiLabel:       { color: T.accentText, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  roiNum:         { color: T.accentText, fontSize: 24, fontWeight: '800' },
  roiSub:         { color: T.accentDark, fontSize: 11, marginTop: 4 },
  sectionLabel:   { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  card:           { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: T.border },
  cardHeader:     { flexDirection: 'row', marginBottom: 12 },
  cardVehiculo:   { color: T.text, fontSize: 14, fontWeight: '700' },
  cardRed:        { fontSize: 12, fontWeight: '600', marginTop: 2 },
  cardFecha:      { color: T.muted, fontSize: 11, marginTop: 2 },
  cardInversion:  { fontSize: 14, fontWeight: '800' },
  cardStats:      { flexDirection: 'row', gap: 8 },
  cardStat:       { flex: 1, backgroundColor: T.bg, borderRadius: 8, padding: 8, alignItems: 'center' },
  cardStatNum:    { fontSize: 14, fontWeight: '800' },
  cardStatLabel:  { color: T.muted, fontSize: 9, marginTop: 2, fontWeight: '600' },
  cardNotas:      { color: T.muted, fontSize: 11, marginTop: 10, fontStyle: 'italic' },
  empty:          { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyText:      { color: T.text, fontSize: 16, fontWeight: '700' },
  emptySub:       { color: T.muted, fontSize: 13 },
  fab:            { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  fabText:        { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 32 },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:      { backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitulo:    { color: T.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  inputLabel:     { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input:          { backgroundColor: T.bg, borderRadius: 10, padding: 12, color: T.text, fontSize: 14, borderWidth: 0.5, borderColor: T.border },
  modalBtns:      { flexDirection: 'row', gap: 10, marginTop: 24 },
  btnCancelar:    { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText:{ color: T.muted, fontWeight: '700' },
  btnGuardar:     { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.accent },
  btnGuardarText: { color: '#fff', fontWeight: '800' },
})