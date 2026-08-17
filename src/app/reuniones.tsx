import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientesService'
import { Client, Reunion } from '../lib/types'
import { T } from '../lib/theme'
import { useToast } from '../components/Toast'
import { mensajeError } from '../lib/errores'

const NEGRO = '#1A1A2E'

export default function ReunionesScreen() {
  const router = useRouter()
  const { mostrarToast } = useToast()
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
  const [refreshing, setRefreshing]       = useState(false)
  const [mostrarClientes, setMostrarClientes] = useState(false)

  useEffect(() => { cargar() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await cargar()
    setRefreshing(false)
  }

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
    if (!titulo.trim()) { Alert.alert('Falta el título', 'Ingresá un título para la reunión'); return }
    if (!fecha.trim())  { Alert.alert('Falta la fecha', 'Ingresá la fecha de la reunión'); return }
    if (!hora.trim())   { Alert.alert('Falta la hora', 'Ingresá la hora de la reunión'); return }

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
      mostrarToast('Reunión agendada', 'success')
    } catch (e) {
      mostrarToast(mensajeError(e), 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function completar(id: string, val: boolean) {
    await supabase.from('reuniones').update({ completada: val }).eq('id', id)
    await cargar()
  }

  function eliminar(id: string) {
    Alert.alert(
      '¿Eliminar esta reunión?',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('reuniones').delete().eq('id', id)
            await cargar()
          },
        },
      ]
    )
  }

  const hoy      = new Date().toISOString().split('T')[0]
  const proximas = reuniones.filter(r => !r.completada && r.fecha >= hoy)
  const pasadas  = reuniones.filter(r => r.completada || r.fecha < hoy)

  // Resumen de la semana actual (lunes a domingo)
  const hoyDate = new Date()
  const diaSemana = hoyDate.getDay() // 0 dom, 1 lun...
  const lunes = new Date(hoyDate)
  lunes.setDate(hoyDate.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const cant = reuniones.filter(r => r.fecha === iso && !r.completada).length
    return {
      iso,
      letra: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i],
      numero: d.getDate(),
      esHoy: iso === hoy,
      cant,
    }
  })
  const totalSemana = diasSemana.reduce((a, d) => a + d.cant, 0)
  const clientesFiltrados = clients.filter(c =>
    c.name.toLowerCase().includes(busqueda.toLowerCase())
  )
  const clienteSeleccionado = clients.find(c => c.id === clienteId)

  function esHoy(fecha: string) {
    return fecha === hoy
  }

  function esManana(fecha: string) {
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    return fecha === manana.toISOString().split('T')[0]
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#04dedf" colors={["#04dedf"]} />}
      >
        <Text style={styles.titulo}>Agenda</Text>
        <Text style={styles.sub}>
          {proximas.length === 0
            ? 'Sin reuniones pendientes'
            : `${proximas.length} reunión${proximas.length !== 1 ? 'es' : ''} próxima${proximas.length !== 1 ? 's' : ''}`}
        </Text>

        <View style={styles.semanaCard}>
          <View style={styles.semanaHeader}>
            <Text style={styles.semanaTitulo}>Esta semana</Text>
            <Text style={styles.semanaTotal}>
              {totalSemana === 0 ? 'Sin reuniones' : `${totalSemana} reunión${totalSemana !== 1 ? 'es' : ''}`}
            </Text>
          </View>
          <View style={styles.semanaDias}>
            {diasSemana.map((d, i) => (
              <View key={i} style={styles.diaCol}>
                <Text style={[styles.diaLetra, d.esHoy && { color: T.accentText, fontWeight: '800' }]}>{d.letra}</Text>
                <View style={[
                  styles.diaNum,
                  d.esHoy && styles.diaNumHoy,
                  d.cant > 0 && !d.esHoy && styles.diaNumConReunion,
                ]}>
                  <Text style={[
                    styles.diaNumText,
                    d.esHoy && { color: '#fff' },
                    d.cant > 0 && !d.esHoy && { color: T.accentText, fontWeight: '800' },
                  ]}>
                    {d.numero}
                  </Text>
                </View>
                {d.cant > 0 && (
                  <View style={[styles.diaPunto, { backgroundColor: d.esHoy ? T.accent : T.accentText }]} />
                )}
                {d.cant === 0 && <View style={styles.diaPuntoVacio} />}
              </View>
            ))}
          </View>
        </View>

        {proximas.length === 0 && pasadas.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color={T.muted} />
            <Text style={styles.emptyText}>Sin reuniones agendadas</Text>
            <Text style={styles.emptySub}>Tocá el + para agendar una</Text>
          </View>
        )}

        {proximas.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: T.accent }]} />
              <Text style={styles.sectionLabel}>PRÓXIMAS</Text>
            </View>
            {proximas.map(r => {
              const cliente = clients.find(c => c.id === r.client_id)
              const hoyFlag = esHoy(r.fecha)
              return (
                <View key={r.id} style={styles.card}>
                  {hoyFlag && <View style={[styles.strip, { backgroundColor: T.accent }]} />}
                  <View style={styles.cardBody}>
                    <View style={styles.cardRow}>
                      <View style={[styles.fechaBox, hoyFlag && { backgroundColor: NEGRO }]}>
                        <Text style={[styles.fechaDia, hoyFlag && { color: '#fff' }]}>
                          {r.fecha.split('-')[2]}
                        </Text>
                        <Text style={[styles.fechaMes, hoyFlag && { color: '#fff' }]}>
                          {new Date(r.fecha + 'T00:00:00').toLocaleString('es-PY', { month: 'short' })}
                        </Text>
                      </View>

                      <View style={styles.cardInfo}>
                        <View style={styles.tituloRow}>
                          <Text style={styles.cardTitulo} numberOfLines={1}>{r.titulo}</Text>
                          {hoyFlag && (
                            <View style={[styles.tag, { backgroundColor: T.accentDim }]}>
                              <Text style={[styles.tagText, { color: T.accentText }]}>Hoy</Text>
                            </View>
                          )}
                          {esManana(r.fecha) && (
                            <View style={[styles.tag, { backgroundColor: T.warmDim }]}>
                              <Text style={[styles.tagText, { color: T.warmText }]}>Mañana</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={12} color={T.muted} />
                          <Text style={styles.cardHora}>{r.hora}</Text>
                        </View>

                        {cliente && (
                          <TouchableOpacity
                            style={styles.metaRow}
                            onPress={() => router.push(`/cliente/${cliente.id}`)}
                          >
                            <Ionicons name="person-outline" size={12} color={T.accentText} />
                            <Text style={styles.cardCliente}>{cliente.name}</Text>
                          </TouchableOpacity>
                        )}

                        {r.notas && <Text style={styles.cardNotas} numberOfLines={2}>{r.notas}</Text>}
                      </View>

                      <View style={styles.acciones}>
                        <TouchableOpacity onPress={() => completar(r.id, true)} style={styles.accionBtn}>
                          <Ionicons name="checkmark" size={17} color={T.green} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => eliminar(r.id)} style={styles.accionBtn}>
                          <Ionicons name="trash-outline" size={16} color={T.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              )
            })}
          </>
        )}

        {pasadas.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <View style={[styles.dot, { backgroundColor: T.muted }]} />
              <Text style={styles.sectionLabel}>COMPLETADAS / PASADAS</Text>
            </View>
            {pasadas.slice(0, 5).map(r => {
              const cliente = clients.find(c => c.id === r.client_id)
              return (
                <View key={r.id} style={[styles.card, { opacity: 0.55 }]}>
                  <View style={styles.cardBody}>
                    <View style={styles.cardRow}>
                      <View style={[styles.fechaBox, { backgroundColor: T.bg }]}>
                        <Text style={[styles.fechaDia, { color: T.muted }]}>{r.fecha.split('-')[2]}</Text>
                        <Text style={[styles.fechaMes, { color: T.muted }]}>
                          {new Date(r.fecha + 'T00:00:00').toLocaleString('es-PY', { month: 'short' })}
                        </Text>
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitulo, { textDecorationLine: 'line-through', color: T.muted }]} numberOfLines={1}>
                          {r.titulo}
                        </Text>
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={12} color={T.muted} />
                          <Text style={styles.cardHora}>{r.hora}{cliente ? ` · ${cliente.name}` : ''}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => eliminar(r.id)} style={styles.accionBtn}>
                        <Ionicons name="trash-outline" size={16} color={T.muted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )
            })}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitulo}>Nueva reunión</Text>

              <Text style={styles.inputLabel}>Título *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Visita en concesionaria"
                placeholderTextColor={T.muted}
                value={titulo}
                onChangeText={setTitulo}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.3 }}>
                  <Text style={styles.inputLabel}>Fecha *</Text>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="calendar-outline" size={16} color={T.muted} />
                    <TextInput
                      style={styles.inputIcon}
                      placeholder="15/07/2026"
                      placeholderTextColor={T.muted}
                      value={fecha}
                      onChangeText={setFecha}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Hora *</Text>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="time-outline" size={16} color={T.muted} />
                    <TextInput
                      style={styles.inputIcon}
                      placeholder="10:30"
                      placeholderTextColor={T.muted}
                      value={hora}
                      onChangeText={setHora}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Cliente (opcional)</Text>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setMostrarClientes(!mostrarClientes)}
                activeOpacity={0.7}
              >
                <View style={styles.inlineRow}>
                  <Ionicons name="person-outline" size={16} color={T.muted} />
                  <Text style={{ color: clienteSeleccionado ? NEGRO : T.muted, fontSize: 14 }}>
                    {clienteSeleccionado ? clienteSeleccionado.name : 'Seleccioná un cliente'}
                  </Text>
                </View>
                <Ionicons name={mostrarClientes ? 'chevron-up' : 'chevron-down'} size={17} color={T.muted} />
              </TouchableOpacity>

              {mostrarClientes && (
                <View style={styles.clienteDropdown}>
                  <View style={[styles.inputIconWrap, { margin: 10, marginBottom: 4 }]}>
                    <Ionicons name="search" size={15} color={T.muted} />
                    <TextInput
                      style={styles.inputIcon}
                      placeholder="Buscar cliente..."
                      placeholderTextColor={T.muted}
                      value={busqueda}
                      onChangeText={setBusqueda}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.clienteOpcion}
                    onPress={() => { setClienteId(null); setMostrarClientes(false) }}
                  >
                    <Text style={{ color: T.muted, fontSize: 13 }}>Sin cliente</Text>
                  </TouchableOpacity>
                  {clientesFiltrados.slice(0, 8).map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.clienteOpcion}
                      onPress={() => { setClienteId(c.id); setMostrarClientes(false) }}
                    >
                      <Text style={{ color: NEGRO, fontWeight: '600', fontSize: 13.5 }}>{c.name}</Text>
                      {c.vehicle_interest ? (
                        <Text style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{c.vehicle_interest}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Notas (opcional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 76, textAlignVertical: 'top' }]}
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
                  {guardando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnGuardarText}>Agendar reunión</Text>
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
  inlineRow:       { flexDirection: 'row', alignItems: 'center', gap: 7 },

  titulo:          { color: NEGRO, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  semanaCard:      { backgroundColor: T.white, borderRadius: 18, padding: 16, marginBottom: 22, borderWidth: 0.5, borderColor: T.border },
  semanaHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  semanaTitulo:    { color: NEGRO, fontSize: 14, fontWeight: '800' },
  semanaTotal:     { color: T.muted, fontSize: 12, fontWeight: '500' },
  semanaDias:      { flexDirection: 'row', justifyContent: 'space-between' },
  diaCol:          { alignItems: 'center', gap: 6, flex: 1 },
  diaLetra:        { color: T.muted, fontSize: 11, fontWeight: '600' },
  diaNum:          { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg },
  diaNumHoy:       { backgroundColor: NEGRO },
  diaNumConReunion:{ backgroundColor: T.accentDim },
  diaNumText:      { color: T.textSub, fontSize: 13.5, fontWeight: '600' },
  diaPunto:        { width: 5, height: 5, borderRadius: 2.5 },
  diaPuntoVacio:   { width: 5, height: 5 },
  sub:             { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 20, fontWeight: '500' },

  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  sectionLabel:    { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  dot:             { width: 7, height: 7, borderRadius: 3.5 },

  card:            { backgroundColor: T.white, borderRadius: 16, marginBottom: 9, borderWidth: 0.5, borderColor: T.border, flexDirection: 'row', overflow: 'hidden' },
  strip:           { width: 4 },
  cardBody:        { flex: 1, padding: 14 },
  cardRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fechaBox:        { width: 48, height: 48, borderRadius: 13, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center' },
  fechaDia:        { fontSize: 17, fontWeight: '800', color: T.accentText, letterSpacing: -0.5 },
  fechaMes:        { fontSize: 9, fontWeight: '700', color: T.accentText, textTransform: 'uppercase', marginTop: -1 },
  cardInfo:        { flex: 1 },
  tituloRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardTitulo:      { color: NEGRO, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  metaRow:         { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  cardHora:        { color: T.muted, fontSize: 11.5 },
  cardCliente:     { color: T.accentText, fontSize: 11.5, fontWeight: '600' },
  cardNotas:       { color: T.muted, fontSize: 11.5, marginTop: 4, fontStyle: 'italic' },
  tag:             { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText:         { fontSize: 9.5, fontWeight: '700' },
  acciones:        { gap: 6 },
  accionBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },

  empty:           { alignItems: 'center', marginTop: 70, gap: 8 },
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
  selectBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 0.5, borderColor: T.border },
  clienteDropdown: { backgroundColor: T.white, borderRadius: 12, borderWidth: 0.5, borderColor: T.border, marginTop: 6, maxHeight: 240, overflow: 'hidden' },
  clienteOpcion:   { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: T.border },

  modalBtns:       { flexDirection: 'row', gap: 10, marginTop: 26 },
  btnCancelar:     { flex: 1, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText: { color: T.textSub, fontWeight: '700', fontSize: 14 },
  btnGuardar:      { flex: 1.4, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: NEGRO },
  btnGuardarText:  { color: '#fff', fontWeight: '800', fontSize: 14 },
})
