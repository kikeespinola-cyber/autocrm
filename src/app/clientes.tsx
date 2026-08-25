import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl, ActivityIndicator, InteractionManager } from 'react-native'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Client, Origen } from '../lib/types'
import { getClients, addClient } from '../lib/clientesService'
import { mensajeError } from '../lib/errores'
import { T, tempColor, tempDim, tempTextColor, tempLabel } from '../lib/theme'
import Tooltip from '../components/Tooltip'
import { tooltipVisto, marcarTooltipVisto } from '../lib/tooltips'
import { useToast } from '../components/Toast'

const NEGRO = '#1A1A2E'

const ORIGENES: { key: Origen; label: string; icon: string }[] = [
  { key: 'salon',      label: 'Salón',     icon: 'business-outline' },
  { key: 'red_social', label: 'Red social', icon: 'phone-portrait-outline' },
  { key: 'referido',   label: 'Referido',   icon: 'people-outline' },
  { key: 'pauta',      label: 'Pauta',      icon: 'megaphone-outline' },
  { key: 'otro',       label: 'Otro',       icon: 'ellipsis-horizontal' },
]

const ORIGEN_ICON: Record<string, any> = {
  salon:      'business-outline',
  red_social: 'phone-portrait-outline',
  referido:   'people-outline',
  pauta:      'megaphone-outline',
  otro:       'ellipsis-horizontal',
}

const FILTROS = [
  { key: 'todos', label: 'Todos', color: null },
  { key: 'hot',   label: 'Hot',   color: '#EF4444' },
  { key: 'warm',  label: 'Warm',  color: '#F59E0B' },
  { key: 'cold',  label: 'Cold',  color: '#4A8AE8' },
]

export default function ClientesScreen() {
  const router = useRouter()
  const { mostrarToast } = useToast()
  const [clients, setClients]         = useState<Client[]>([])
  const [loading, setLoading]         = useState(true)
  const params = useLocalSearchParams<{ nuevo?: string }>()
  const [modal, setModal]             = useState(false)
  const [search, setSearch]           = useState('')
  const [filtro, setFiltro]           = useState('todos')
  const [nombre, setNombre]           = useState('')
  const [telefono, setTelefono]       = useState('')
  const [vehiculo, setVehiculo]       = useState('')
  const [presupuesto, setPresupuesto] = useState('')
  const [trabajo, setTrabajo]         = useState('')
  const [cumple, setCumple]           = useState('')
  const [club, setClub]               = useState('')
  const [temp, setTemp]               = useState<'hot'|'warm'|'cold'>('warm')
  const [origen, setOrigen]           = useState<Origen | null>(null)
  const [masDetalles, setMasDetalles] = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [guardando, setGuardando]     = useState(false)
  const [mostrarTooltip, setMostrarTooltip] = useState(false)

  useFocusEffect(
    React.useCallback(() => {
      cargar()
      tooltipVisto('clientes').then(visto => {
        if (!visto) setMostrarTooltip(true)
      })
    }, [])
  )

  // El deep link "Agregar mi primer cliente" (index.tsx) llega como ?nuevo=1.
  // Va en un useEffect propio y no en el useFocusEffect: el parametro se consume
  // una sola vez, cuando llega. Si quedara en la ruta, cada foco de la pantalla
  // volveria a abrir el modal solo.
  useEffect(() => {
    if (params.nuevo !== '1') return
    router.setParams({ nuevo: undefined })
    // Esperamos a que termine la transicion de navegacion en vez de adivinar un
    // delay. Presentar un Modal mientras la pantalla entra puede fallar en
    // Android y dejar el estado en true sin nada visible: desde ahi el boton +
    // queda muerto, porque setModal(true) sobre un true ya es un no-op.
    const tarea = InteractionManager.runAfterInteractions(() => abrirNuevoCliente())
    return () => tarea.cancel()
  }, [params.nuevo])

  async function onRefresh() {
    setRefreshing(true)
    await cargar()
    setRefreshing(false)
  }

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

  function limpiarForm() {
    setNombre(''); setTelefono(''); setVehiculo(''); setPresupuesto('')
    setTrabajo(''); setCumple(''); setClub(''); setTemp('warm'); setOrigen(null)
    setMasDetalles(false)
  }

  // Unica puerta de entrada al modal: el form arranca limpio y se abre al toque,
  // sin timers de por medio.
  function abrirNuevoCliente() {
    limpiarForm()
    setModal(true)
  }

  async function guardarCliente() {
    if (!nombre.trim()) {
      Alert.alert('Falta el nombre', 'Ingresá el nombre del cliente para continuar.')
      return
    }
    if (nombre.trim().length < 3) {
      Alert.alert('Nombre muy corto', 'Ingresá el nombre completo del cliente.')
      return
    }
    if (telefono.trim() && !/^[0-9\s\-+()]{6,15}$/.test(telefono.trim())) {
      Alert.alert('Teléfono inválido', 'Revisá el formato del número de teléfono.')
      return
    }
    const esPrimero = clients.length === 0
    setGuardando(true)
    try {
      await addClient({
        name: nombre.trim(),
        phone: telefono.trim() || null,
        vehicle_interest: vehiculo.trim() || null,
        budget: presupuesto.trim() || null,
        job: trabajo.trim() || null,
        birthday: cumple.trim() || null,
        club: club.trim() || null,
        temperature: temp,
        origen: origen || null,
      })
      limpiarForm()
      setModal(false)
      await cargar()
      mostrarToast(esPrimero ? '¡Tu primer cliente! Ya podés arrancar 🎉' : 'Cliente guardado', 'success')
    } catch (e) {
      mostrarToast(mensajeError(e), 'error')
    } finally {
      setGuardando(false)
    }
  }

  const filtrados = clients.filter(c => {
    if (filtro !== 'todos' && c.temperature !== filtro) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      (c.vehicle_interest || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.job || '').toLowerCase().includes(q) ||
      (c.club || '').toLowerCase().includes(q) ||
      (c.comentario_clave || '').toLowerCase().includes(q) ||
      (c.etapa || '').toLowerCase().includes(q) ||
      (c.origen || '').toLowerCase().includes(q) ||
      (c.budget || '').toLowerCase().includes(q)
    )
  })

  const origenLabel: Record<Origen, string> = {
    salon:      'Salón',
    red_social: 'Red social',
    referido:   'Referido',
    pauta:      'Pauta',
    otro:       'Otro',
  }

  function contarPorTemp(t: string) {
    if (t === 'todos') return clients.length
    return clients.filter(c => c.temperature === t).length
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#04dedf" colors={["#04dedf"]} />}
      >

        <View style={styles.header}>
          <View>
            <Text style={styles.titulo}>Clientes</Text>
            <Text style={styles.subtitulo}>{clients.length} lead{clients.length !== 1 ? 's' : ''} en total</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={T.muted} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente, vehículo, teléfono..."
            placeholderTextColor={T.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={17} color={T.muted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTROS.map(f => {
            const activo = filtro === f.key
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFiltro(f.key)}
                style={[styles.chip, activo && styles.chipActivo]}
              >
                {f.color && <View style={[styles.chipDot, { backgroundColor: f.color }]} />}
                <Text style={[styles.chipText, activo && styles.chipTextActivo]}>
                  {f.label}
                </Text>
                <View style={[styles.chipCount, activo && styles.chipCountActivo]}>
                  <Text style={[styles.chipCountText, activo && styles.chipCountTextActivo]}>
                    {contarPorTemp(f.key)}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {filtrados.map(c => (
          <TouchableOpacity
            key={c.id}
            style={styles.card}
            onPress={() => router.push(`/cliente/${c.id}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.tempStrip, { backgroundColor: tempColor(c.temperature) }]} />

            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: tempDim(c.temperature) }]}>
                  <Text style={[styles.avatarText, { color: tempTextColor(c.temperature) }]}>
                    {c.name.slice(0,2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.cardVehicle} numberOfLines={1}>
                    {c.vehicle_interest || 'Sin vehículo asignado'}
                  </Text>
                  <View style={styles.metaRow}>
                    {c.calificacion ? (
                      <View style={styles.starsRow}>
                        {[...Array(c.calificacion)].map((_, i) => (
                          <Ionicons key={i} name="star" size={10} color="#F59E0B" />
                        ))}
                      </View>
                    ) : null}
                    {c.origen && (
                      <View style={styles.origenRow}>
                        <Ionicons name={ORIGEN_ICON[c.origen]} size={10} color={T.muted} />
                        <Text style={styles.cardOrigen}>{origenLabel[c.origen]}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <View style={[styles.badge, { backgroundColor: tempDim(c.temperature) }]}>
                    <Text style={[styles.badgeText, { color: tempTextColor(c.temperature) }]}>
                      {tempLabel(c.temperature)}
                    </Text>
                  </View>
                  {c.docs_received && (
                    <View style={styles.tagRow}>
                      <Ionicons name="document-text" size={10} color={T.green} />
                      <Text style={styles.docsTag}>Docs</Text>
                    </View>
                  )}
                  {c.sold && (
                    <View style={styles.tagRow}>
                      <Ionicons name="trophy" size={10} color={T.green} />
                      <Text style={styles.soldTag}>Vendido</Text>
                    </View>
                  )}
                </View>
              </View>

              {c.budget ? (
                <View style={styles.cardFooter}>
                  <Text style={styles.budgetLabel}>Presupuesto</Text>
                  <Text style={styles.budgetValue}>{c.budget}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}

        {filtrados.length === 0 && !loading && (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={T.muted} />
            <Text style={styles.emptyText}>
              {search || filtro !== 'todos' ? 'Sin resultados' : 'Sin clientes todavía'}
            </Text>
            <Text style={styles.emptySub}>
              {search || filtro !== 'todos' ? 'Probá con otro filtro o búsqueda' : 'Tocá el + para agregar el primero'}
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={abrirNuevoCliente} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Tooltip
        visible={mostrarTooltip}
        titulo="Clientes"
        descripcion="Acá están todos tus leads. Tocá el + para agregar uno nuevo. Podés filtrar por temperatura o buscar por nombre, teléfono, vehículo o etapa. Tocá cualquier cliente para ver su ficha completa."
        onCerrar={() => { setMostrarTooltip(false); marcarTooltipVisto('clientes') }}
      />

      <Modal visible={modal} animationType='slide' transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitulo}>Nuevo cliente</Text>

              {/* Campos esenciales - carga rápida */}
              {[
                { label:'Nombre *',            value:nombre,   set:setNombre,   placeholder:'Ej: Carlos Mendoza', keyboard:'default' as const },
                { label:'Teléfono',            value:telefono, set:setTelefono, placeholder:'0981 234 567', keyboard:'phone-pad' as const },
                { label:'Vehículo de interés', value:vehiculo, set:setVehiculo, placeholder:'Ej: Toyota Hilux 2024', keyboard:'default' as const },
              ].map(f => (
                <View key={f.label}>
                  <Text style={styles.inputLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    placeholderTextColor={T.muted}
                    value={f.value}
                    onChangeText={f.set}
                    keyboardType={f.keyboard}
                  />
                </View>
              ))}

              {/* Detalles opcionales - plegados */}
              <TouchableOpacity
                style={styles.masBtn}
                onPress={() => setMasDetalles(!masDetalles)}
                activeOpacity={0.7}
              >
                <Ionicons name={masDetalles ? 'remove-circle-outline' : 'add-circle-outline'} size={17} color={T.accentText} />
                <Text style={styles.masBtnText}>
                  {masDetalles ? 'Ocultar detalles' : 'Agregar más detalles (opcional)'}
                </Text>
              </TouchableOpacity>

              {masDetalles && (
                <>
                  {[
                    { label:'Presupuesto',     value:presupuesto, set:setPresupuesto, placeholder:'Ej: 180.000.000' },
                    { label:'Trabajo / Rubro', value:trabajo,     set:setTrabajo,     placeholder:'Ej: Transportista' },
                    { label:'Cumpleaños',      value:cumple,      set:setCumple,      placeholder:'Ej: 01/07' },
                    { label:'Club de fútbol',  value:club,        set:setClub,        placeholder:'Ej: Olimpia' },
                  ].map(f => (
                    <View key={f.label}>
                      <Text style={styles.inputLabel}>{f.label}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={f.placeholder}
                        placeholderTextColor={T.muted}
                        value={f.value}
                        onChangeText={f.set}
                      />
                    </View>
                  ))}

                  <Text style={styles.inputLabel}>Origen del lead</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {ORIGENES.map(o => {
                      const sel = origen === o.key
                      return (
                        <TouchableOpacity
                          key={o.key}
                          onPress={() => setOrigen(sel ? null : o.key)}
                          style={[styles.origenChip, sel && { backgroundColor: NEGRO, borderColor: NEGRO }]}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={o.icon as any} size={13} color={sel ? '#fff' : T.textSub} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: sel ? '#fff' : T.textSub }}>
                            {o.label}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>Temperatura</Text>
              <View style={styles.tempRow}>
                {(['hot','warm','cold'] as const).map(t => {
                  const act = temp === t
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setTemp(t)}
                      activeOpacity={0.8}
                      style={[styles.tempBtn, {
                        backgroundColor: act ? tempColor(t) : T.bg,
                        borderColor: act ? tempColor(t) : T.border,
                      }]}
                    >
                      <View style={[styles.chipDot, { backgroundColor: act ? '#fff' : tempColor(t) }]} />
                      <Text style={[styles.tempBtnText, { color: act ? '#fff' : T.textSub }]}>
                        {tempLabel(t)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => { limpiarForm(); setModal(false) }}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGuardar} onPress={guardarCliente} disabled={guardando}>
                  {guardando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnGuardarText}>Guardar cliente</Text>
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
  container:        { flex: 1, backgroundColor: T.bg },
  content:          { padding: 20, paddingTop: 24, paddingBottom: 110 },
  header:           { marginBottom: 18 },
  titulo:           { color: NEGRO, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  subtitulo:        { color: T.muted, fontSize: 13, marginTop: 3, fontWeight: '500' },

  searchBox:        { flexDirection: 'row', alignItems: 'center', backgroundColor: T.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14, borderWidth: 0.5, borderColor: T.border },

  searchInput:      { flex: 1, color: NEGRO, fontSize: 14 },
  clearBtn:         { paddingLeft: 8, paddingVertical: 2 },

  chipsScroll:      { marginBottom: 18, marginHorizontal: -20 },
  chipsRow:         { paddingHorizontal: 20, gap: 8 },
  chip:             { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 22, backgroundColor: T.white, borderWidth: 0.5, borderColor: T.border },
  chipActivo:       { backgroundColor: NEGRO, borderColor: NEGRO },
  chipDot:          { width: 8, height: 8, borderRadius: 4 },
  chipText:         { fontSize: 13, fontWeight: '600', color: T.textSub },
  chipTextActivo:   { color: '#fff' },
  chipCount:        { backgroundColor: T.bg, borderRadius: 10, minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  chipCountActivo:  { backgroundColor: 'rgba(255,255,255,0.2)' },
  chipCountText:    { fontSize: 11, fontWeight: '800', color: T.muted },
  chipCountTextActivo: { color: '#fff' },

  card:             { backgroundColor: T.white, borderRadius: 16, marginBottom: 10, borderWidth: 0.5, borderColor: T.border, flexDirection: 'row', overflow: 'hidden' },
  tempStrip:        { width: 4 },
  cardBody:         { flex: 1, padding: 14 },
  cardTop:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:           { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText:       { fontSize: 15, fontWeight: '800' },
  cardInfo:         { flex: 1 },
  cardName:         { color: NEGRO, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  cardVehicle:      { color: T.textSub, fontSize: 12.5, marginTop: 2 },
  metaRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  starsRow:         { flexDirection: 'row', gap: 1 },
  origenRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardOrigen:       { color: T.muted, fontSize: 11 },
  tagRow:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  origenChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
  masBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, marginTop: 6, marginBottom: 4 },
  masBtnText:       { color: T.accentText, fontSize: 13.5, fontWeight: '700' },
  cardRight:        { alignItems: 'flex-end', gap: 5 },
  badge:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:        { fontSize: 10.5, fontWeight: '700' },
  docsTag:          { color: T.green, fontSize: 10, fontWeight: '700' },
  soldTag:          { color: T.green, fontSize: 10, fontWeight: '700' },
  cardFooter:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 11, borderTopWidth: 0.5, borderTopColor: T.border },
  budgetLabel:      { color: T.muted, fontSize: 11, fontWeight: '500' },
  budgetValue:      { color: NEGRO, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

  empty:            { alignItems: 'center', marginTop: 70, gap: 8 },
  emptyText:        { color: NEGRO, fontSize: 16, fontWeight: '700' },
  emptySub:         { color: T.muted, fontSize: 13, textAlign: 'center' },

  fab:              { position: 'absolute', bottom: 26, right: 22, width: 58, height: 58, borderRadius: 29, backgroundColor: NEGRO, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },


  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:        { backgroundColor: T.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 12, paddingBottom: 40 },
  modalHandle:      { width: 38, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 18 },
  modalTitulo:      { color: NEGRO, fontSize: 20, fontWeight: '800', marginBottom: 8, letterSpacing: -0.4 },
  inputLabel:       { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 7, marginTop: 14 },
  input:            { backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: NEGRO, fontSize: 14, borderWidth: 0.5, borderColor: T.border },
  tempRow:          { flexDirection: 'row', gap: 8, marginTop: 6 },
  tempBtn:          { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  tempBtnText:      { fontSize: 12.5, fontWeight: '700' },
  modalBtns:        { flexDirection: 'row', gap: 10, marginTop: 26 },
  btnCancelar:      { flex: 1, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText:  { color: T.textSub, fontWeight: '700', fontSize: 14 },
  btnGuardar:       { flex: 1.4, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: NEGRO },
  btnGuardarText:   { color: '#fff', fontWeight: '800', fontSize: 14 },
})
