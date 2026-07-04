import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientesService'
import { Client, Reunion } from '../lib/types'
import { T } from '../lib/theme'

export default function ReunionesScreen() {
  const router = useRouter()
  const [reuniones, setReuniones]         = useState<Reunion[]>([])
  const [clients, setClients]             = useState<Client[]>([])
  const [modal, setModal]                 = useState(false)
  const [guardando, setGuardando]         = useState(false)
  const [titulo, setTitulo]               = useState('')
  const [fecha, setFecha]                 = useState('')
  const [hora, setHora]                   = useState('')
  const [notas, setNotas]                 = useState('')
  const [clienteId, setClienteId]         = useState<string | null>(null)
  const [busqueda, setBusqueda]           = useState('')
  const [mostrarClientes, setMostrarClientes] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: r } = await supabase
      .from('reuniones')
      .select('*')
      .eq('user_id', user?.id)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true })
    if (r) setReuniones(r)
    const c = await getClients()
    setClients(c)
  }

  function limpiar() {
    setTitulo(''); setFecha(''); setHora(''); setNotas(''); setClienteId(null); setBusqueda('')
  }

  async function guardar() {
    if (!titulo.trim()) { Alert.alert('Error', 'El título es obligatorio'); return }
    if (!fecha.trim())  { Alert.alert('Error', 'La fecha es obligatoria'); return }
    if (!hora.trim())   { Alert.alert('Error', 'La hora es obligatoria'); return }

    let fechaISO = fecha.trim()
    if (fecha.includes('/')) {
      const partes = fecha.split('/')
      const dia  = partes[0].padStart(2, '0')
      const mes  = partes[1].padStart(2, '0')
      const anio = partes[2] ? partes[2] : new Date().getFullYear().toString()
      fechaISO = `${anio}-${mes}-${dia}`
    }

    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('reuniones').insert({
        user_id: user?.id,
        client_id: clienteId || null,
        titulo: titulo.trim(),
        fecha: fechaISO,
        hora: hora.trim(),
        notas: notas.trim() || null,
      })
      limpiar(); setModal(false); await cargar()
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function completar(id: string, val: boolean) {
    await supabase.from('reuniones').update({ completada: val }).eq('id', id)
    await cargar()
  }

  async function eliminar(id: string) {
    const ok = typeof window !== 'undefined' ? window.confirm('¿Eliminar esta reunión?') : false
    if (!ok) return
    await supabase.from('reuniones').delete().eq('id', id)
    await cargar()
  }

  const hoy      = new Date().toISOString().split('T')[0]
  const proximas = reuniones.filter(r => !r.completada && r.fecha >= hoy)
  const pasadas  = reuniones.filter(r => r.completada || r.fecha < hoy)
  const clientesFiltrados = clients.filter(c =>
    c.name.toLowerCase().includes(busqueda.toLowerCase())
  )
  const clienteSeleccionado = clients.find(c => c.id === clienteId)

  function esHoy(fecha: string) {
    return fecha === hoy
  }

  function esMañana(fecha: string) {
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    return fecha === manana.toISOString().split('T')[0]
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Agenda</Text>
        <Text style={styles.sub}>Tus citas y visitas agendadas</Text>

        {proximas.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 32 }}>📅</Text>
            <Text style={styles.emptyText}>Sin reuniones agendadas</Text>
            <Text style={styles.emptySub}>Tocá el + para agendar una</Text>
          </View>
        )}

        {proximas.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>PRÓXIMAS</Text>
            {proximas.map(r => {
              const cliente = clients.find(c => c.id === r.client_id)
              return (
                <View key={r.id} style={[styles.card, esHoy(r.fecha) && { borderLeftWidth: 3, borderLeftColor: T.accent }]}>
                  <View style={styles.cardRow}>
                    <View style={styles.fechaBox}>
                      <Text style={styles.fechaDia}>{r.fecha.split('-')[2]}</Text>
                      <Text style={styles.fechaMes}>{new Date(r.fecha + 'T00:00:00').toLocaleString('es-PY', { month: 'short' })}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.cardTitulo}>{r.titulo}</Text>
                        {esHoy(r.fecha) && <Text style={[styles.tagHoy, { backgroundColor: T.accentDim, color: T.accentText }]}>Hoy</Text>}
                        {esMañana(r.fecha) && <Text style={[styles.tagHoy, { backgroundColor: T.warmDim, color: T.warmText }]}>Mañana</Text>}
                      </View>
                      <Text style={styles.cardHora}>🕐 {r.hora}</Text>
                      {cliente && <Text style={styles.cardCliente}>👤 {cliente.name}</Text>}
                      {r.notas && <Text style={styles.cardNotas}>{r.notas}</Text>}
                    </View>
                    <View style={styles.acciones}>
                      <TouchableOpacity onPress={() => completar(r.id, true)}>
                        <Text style={{ fontSize: 20 }}>✅</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => eliminar(r.id)}>
                        <Text style={{ fontSize: 20 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )
            })}
          </>
        )}

        {pasadas.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>COMPLETADAS / PASADAS</Text>
            {pasadas.slice(0, 5).map(r => {
              const cliente = clients.find(c => c.id === r.client_id)
              return (
                <View key={r.id} style={[styles.card, { opacity: 0.6 }]}>
                  <View style={styles.cardRow}>
                    <View style={[styles.fechaBox, { backgroundColor: T.bg }]}>
                      <Text style={[styles.fechaDia, { color: T.muted }]}>{r.fecha.split('-')[2]}</Text>
                      <Text style={[styles.fechaMes, { color: T.muted }]}>{new Date(r.fecha + 'T00:00:00').toLocaleString('es-PY', { month: 'short' })}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardTitulo, { textDecorationLine: 'line-through', color: T.muted }]}>{r.titulo}</Text>
                      <Text style={styles.cardHora}>🕐 {r.hora}{cliente ? ` · ${cliente.name}` : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => eliminar(r.id)}>
                      <Text style={{ fontSize: 18 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitulo}>Nueva reunión</Text>

              <Text style={styles.inputLabel}>Título *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Visita en concesionaria, Llamada de seguimiento"
                placeholderTextColor={T.muted}
                value={titulo}
                onChangeText={setTitulo}
              />

              <Text style={styles.inputLabel}>Fecha * (DD/MM o DD/MM/AAAA)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 15/07 o 15/07/2026"
                placeholderTextColor={T.muted}
                value={fecha}
                onChangeText={setFecha}
              />

              <Text style={styles.inputLabel}>Hora * (HH:MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 10:30"
                placeholderTextColor={T.muted}
                value={hora}
                onChangeText={setHora}
              />

              <Text style={styles.inputLabel}>Cliente (opcional)</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => setMostrarClientes(!mostrarClientes)}
              >
                <Text style={{ color: clienteSeleccionado ? T.text : T.muted, fontSize: 14 }}>
                  {clienteSeleccionado ? clienteSeleccionado.name : 'Seleccioná un cliente...'}
                </Text>
              </TouchableOpacity>

              {mostrarClientes && (
                <View style={styles.clienteDropdown}>
                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    placeholder="Buscar cliente..."
                    placeholderTextColor={T.muted}
                    value={busqueda}
                    onChangeText={setBusqueda}
                  />
                  <TouchableOpacity
                    style={styles.clienteOpcion}
                    onPress={() => { setClienteId(null); setMostrarClientes(false) }}
                  >
                    <Text style={{ color: T.muted }}>Sin cliente</Text>
                  </TouchableOpacity>
                  {clientesFiltrados.slice(0, 8).map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.clienteOpcion}
                      onPress={() => { setClienteId(c.id); setMostrarClientes(false) }}
                    >
                      <Text style={{ color: T.text, fontWeight: '600' }}>{c.name}</Text>
                      <Text style={{ color: T.muted, fontSize: 11 }}>{c.vehicle_interest}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Notas (opcional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                placeholder="Detalles de la reunión..."
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
  container:       { flex: 1, backgroundColor: T.bg },
  content:         { padding: 20, paddingTop: 60, paddingBottom: 100 },
  titulo:          { color: T.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sub:             { color: T.muted, fontSize: 12, marginTop: 4, marginBottom: 20, fontWeight: '500' },
  sectionLabel:    { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  card:            { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: T.border },
  cardRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fechaBox:        { width: 44, height: 44, borderRadius: 10, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center' },
  fechaDia:        { fontSize: 16, fontWeight: '800', color: T.accentText },
  fechaMes:        { fontSize: 9, fontWeight: '600', color: T.accentText, textTransform: 'uppercase' },
  cardInfo:        { flex: 1 },
  cardTitulo:      { color: T.text, fontSize: 14, fontWeight: '700' },
  cardHora:        { color: T.muted, fontSize: 11, marginTop: 3 },
  cardCliente:     { color: T.accentText, fontSize: 11, marginTop: 2, fontWeight: '600' },
  cardNotas:       { color: T.muted, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  tagHoy:          { fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  acciones:        { gap: 8 },
  empty:           { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText:       { color: T.text, fontSize: 16, fontWeight: '700' },
  emptySub:        { color: T.muted, fontSize: 13 },
  fab:             { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  fabText:         { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 32 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitulo:     { color: T.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  inputLabel:      { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input:           { backgroundColor: T.bg, borderRadius: 10, padding: 12, color: T.text, fontSize: 14, borderWidth: 0.5, borderColor: T.border },
  clienteDropdown: { backgroundColor: T.white, borderRadius: 10, borderWidth: 0.5, borderColor: T.border, marginTop: 4, maxHeight: 200, overflow: 'hidden' },
  clienteOpcion:   { padding: 12, borderBottomWidth: 0.5, borderBottomColor: T.border },
  modalBtns:       { flexDirection: 'row', gap: 10, marginTop: 24 },
  btnCancelar:     { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText: { color: T.muted, fontWeight: '700' },
  btnGuardar:      { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.accent },
  btnGuardarText:  { color: '#fff', fontWeight: '800' },
})