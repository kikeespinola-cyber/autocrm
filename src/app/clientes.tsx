import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { Client, Origen } from '../lib/types'
import { getClients, addClient } from '../lib/clientesService'
import { T, tempColor, tempDim, tempTextColor, tempLabel } from '../lib/theme'

const ORIGENES: { key: Origen; label: string; color: string }[] = [
  { key: 'salon',      label: '🏢 Salón',      color: T.blue },
  { key: 'red_social', label: '📱 Red social', color: T.purple },
  { key: 'referido',   label: '🤝 Referido',   color: T.green },
  { key: 'pauta',      label: '📢 Pauta',      color: T.warm },
  { key: 'otro',       label: '✦ Otro',        color: T.muted },
]

export default function ClientesScreen() {
  const router = useRouter()
  const [clients, setClients]         = useState<Client[]>([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [search, setSearch]           = useState('')
  const [nombre, setNombre]           = useState('')
  const [telefono, setTelefono]       = useState('')
  const [vehiculo, setVehiculo]       = useState('')
  const [presupuesto, setPresupuesto] = useState('')
  const [trabajo, setTrabajo]         = useState('')
  const [cumple, setCumple]           = useState('')
  const [club, setClub]               = useState('')
  const [temp, setTemp]               = useState<'hot'|'warm'|'cold'>('warm')
  const [origen, setOrigen]           = useState<Origen | null>(null)
  const [guardando, setGuardando]     = useState(false)

  useEffect(() => { cargar() }, [])

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
    } catch (e) {
      Alert.alert('No se pudo guardar', 'Intentá de nuevo en unos segundos.')
    } finally {
      setGuardando(false)
    }
  }

  const filtrados = clients.filter(c => {
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
    salon:      '🏢 Salón',
    red_social: '📱 Red social',
    referido:   '🤝 Referido',
    pauta:      '📢 Pauta',
    otro:       '✦ Otro',
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Clientes</Text>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, vehículo, teléfono..."
            placeholderTextColor={T.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ fontSize: 16, color: T.muted, paddingLeft: 8 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {filtrados.map(c => (
          <TouchableOpacity key={c.id} style={styles.card} onPress={() => router.push(`/cliente/${c.id}`)}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: '#6366F1' }]}>
                <Text style={styles.avatarText}>{c.name.slice(0,2).toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{c.name}</Text>
                <Text style={styles.cardVehicle}>{c.vehicle_interest || 'Sin vehículo asignado'}</Text>
                {c.budget && <Text style={styles.cardBudget}>{c.budget}</Text>}
                {c.origen && <Text style={styles.cardOrigen}>{origenLabel[c.origen]}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[styles.badge, { backgroundColor: tempDim(c.temperature) }]}>
                  <Text style={[styles.badgeText, { color: tempTextColor(c.temperature) }]}>{tempLabel(c.temperature)}</Text>
                </View>
                {c.docs_received && <Text style={styles.docsTag}>📄 Docs</Text>}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filtrados.length === 0 && !loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin clientes todavía</Text>
            <Text style={styles.emptySub}>Tocá el + para agregar el primero</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType='slide' transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitulo}>Nuevo cliente</Text>

              {[
                { label:'Nombre *',            value:nombre,      set:setNombre,      placeholder:'Ej: Carlos Mendoza' },
                { label:'Teléfono',            value:telefono,    set:setTelefono,    placeholder:'0981 234 567' },
                { label:'Vehículo de interés', value:vehiculo,    set:setVehiculo,    placeholder:'Ej: Toyota Hilux 2024' },
                { label:'Presupuesto',         value:presupuesto, set:setPresupuesto, placeholder:'Ej: 180.000.000' },
                { label:'Trabajo / Rubro',     value:trabajo,     set:setTrabajo,     placeholder:'Ej: Transportista' },
                { label:'Cumpleaños',          value:cumple,      set:setCumple,      placeholder:'Ej: 01/07' },
                { label:'Club de fútbol',      value:club,        set:setClub,        placeholder:'Ej: Olimpia' },
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
                {ORIGENES.map(o => (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => setOrigen(origen === o.key ? null : o.key)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: origen === o.key ? o.color : T.bg,
                      borderWidth: 1, borderColor: o.color + '80',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: origen === o.key ? '#fff' : o.color }}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Temperatura</Text>
              <View style={styles.tempRow}>
                {(['hot','warm','cold'] as const).map(t => (
                  <TouchableOpacity key={t} onPress={() => setTemp(t)}
                    style={[styles.tempBtn, {
                      backgroundColor: temp === t ? tempColor(t) : tempDim(t),
                      borderColor: tempColor(t),
                    }]}>
                    <Text style={[styles.tempBtnText, { color: temp === t ? '#fff' : tempTextColor(t) }]}>
                      {tempLabel(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => { limpiarForm(); setModal(false) }}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGuardar} onPress={guardarCliente} disabled={guardando}>
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
  titulo:          { color: T.text, fontSize: 24, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
  searchBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: T.white, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: T.border },
  searchIcon:      { fontSize: 16, marginRight: 8 },
  searchInput:     { flex: 1, color: T.text, fontSize: 14 },
  card:            { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: T.border },
  cardRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:          { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { color: '#fff', fontSize: 14, fontWeight: '800' },
  cardInfo:        { flex: 1 },
  cardName:        { color: T.text, fontSize: 14, fontWeight: '700' },
  cardVehicle:     { color: T.textSub, fontSize: 12, marginTop: 2 },
  cardBudget:      { color: T.accentText, fontSize: 11, marginTop: 2, fontWeight: '600' },
  cardOrigen:      { color: T.muted, fontSize: 11, marginTop: 2 },
  badge:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:       { fontSize: 11, fontWeight: '700' },
  docsTag:         { color: T.green, fontSize: 10, fontWeight: '700' },
  empty:           { alignItems: 'center', marginTop: 60 },
  emptyText:       { color: T.text, fontSize: 16, fontWeight: '700' },
  emptySub:        { color: T.muted, fontSize: 13, marginTop: 8 },
  fab:             { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  fabText:         { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 32 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitulo:     { color: T.text, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  inputLabel:      { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input:           { backgroundColor: T.bg, borderRadius: 10, padding: 12, color: T.text, fontSize: 14, borderWidth: 0.5, borderColor: T.border },
  tempRow:         { flexDirection: 'row', gap: 8, marginTop: 6 },
  tempBtn:         { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  tempBtnText:     { fontSize: 12, fontWeight: '700' },
  modalBtns:       { flexDirection: 'row', gap: 10, marginTop: 24 },
  btnCancelar:     { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText: { color: T.muted, fontWeight: '700' },
  btnGuardar:      { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.accent },
  btnGuardarText:  { color: '#fff', fontWeight: '800' },
})