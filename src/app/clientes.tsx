import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { Client } from '../lib/types'
import { getClients, addClient } from '../lib/clientesService'

const tempColor = (t: string) => t === 'hot' ? '#FF4444' : t === 'warm' ? '#F0A020' : '#4A8AE8'
const tempLabel = (t: string) => t === 'hot' ? '🔴 Hot' : t === 'warm' ? '🟡 Warm' : '🔵 Cold'
const tempDim   = (t: string) => t === 'hot' ? '#2A0808' : t === 'warm' ? '#2A1A00' : '#0A1428'

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
  const [temp, setTemp]               = useState<'hot'|'warm'|'cold'>('warm')
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

  async function guardarCliente() {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio')
      return
    }
    setGuardando(true)
    try {
      await addClient({
        name: nombre.trim(),
        phone: telefono.trim() || null,
        vehicle_interest: vehiculo.trim() || null,
        budget: presupuesto.trim() || null,
        temperature: temp,
      })
      setNombre(''); setTelefono(''); setVehiculo(''); setPresupuesto(''); setTemp('warm')
      setModal(false)
      await cargar()
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el cliente')
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  const filtrados = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.vehicle_interest || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Clientes</Text>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o vehículo..."
            placeholderTextColor='#55556A'
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {filtrados.map(c => (
          <TouchableOpacity key={c.id} style={styles.card} onPress={() => router.push(`/cliente/${c.id}`)}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: '#7B3FE4' }]}>
                <Text style={styles.avatarText}>{c.name.slice(0,2).toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{c.name}</Text>
                <Text style={styles.cardVehicle}>{c.vehicle_interest || 'Sin vehículo asignado'}</Text>
                <Text style={styles.cardBudget}>{c.budget || ''}</Text>
              </View>
              <Text style={[styles.badge, { color: tempColor(c.temperature), backgroundColor: tempDim(c.temperature) }]}>
                {tempLabel(c.temperature)}
              </Text>
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
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Nuevo cliente</Text>

            <Text style={styles.inputLabel}>Nombre *</Text>
            <TextInput style={styles.input} placeholder="Ej: Carlos Mendoza" placeholderTextColor='#55556A' value={nombre} onChangeText={setNombre} />

            <Text style={styles.inputLabel}>Teléfono</Text>
            <TextInput style={styles.input} placeholder="0981 234 567" placeholderTextColor='#55556A' value={telefono} onChangeText={setTelefono} keyboardType='phone-pad' />

            <Text style={styles.inputLabel}>Vehículo de interés</Text>
            <TextInput style={styles.input} placeholder="Ej: Toyota Hilux 2024" placeholderTextColor='#55556A' value={vehiculo} onChangeText={setVehiculo} />

            <Text style={styles.inputLabel}>Presupuesto</Text>
            <TextInput style={styles.input} placeholder="Ej: ₲ 180.000.000" placeholderTextColor='#55556A' value={presupuesto} onChangeText={setPresupuesto} />

            <Text style={styles.inputLabel}>Temperatura</Text>
            <View style={styles.tempRow}>
              {(['hot','warm','cold'] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setTemp(t)}
                  style={[styles.tempBtn, { backgroundColor: temp === t ? tempColor(t) : tempDim(t), borderColor: tempColor(t) }]}>
                  <Text style={[styles.tempBtnText, { color: temp === t ? '#fff' : tempColor(t) }]}>
                    {tempLabel(t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModal(false)}>
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarCliente} disabled={guardando}>
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
  container:       { flex: 1, backgroundColor: '#0A0A0F' },
  content:         { padding: 20, paddingTop: 60, paddingBottom: 100 },
  titulo:          { color: '#EEEEF5', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  searchBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A24', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#252535' },
  searchIcon:      { fontSize: 16, marginRight: 8 },
  searchInput:     { flex: 1, color: '#EEEEF5', fontSize: 14 },
  card:            { backgroundColor: '#1A1A24', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#252535' },
  cardRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:          { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { color: '#fff', fontSize: 14, fontWeight: '800' },
  cardInfo:        { flex: 1 },
  cardName:        { color: '#EEEEF5', fontSize: 14, fontWeight: '700' },
  cardVehicle:     { color: '#AAAABF', fontSize: 12, marginTop: 2 },
  cardBudget:      { color: '#F0A020', fontSize: 11, marginTop: 2, fontWeight: '600' },
  badge:           { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  empty:           { alignItems: 'center', marginTop: 60 },
  emptyText:       { color: '#EEEEF5', fontSize: 16, fontWeight: '700' },
  emptySub:        { color: '#55556A', fontSize: 13, marginTop: 8 },
  fab:             { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0A020', alignItems: 'center', justifyContent: 'center' },
  fabText:         { color: '#0A0A0F', fontSize: 28, fontWeight: '800', lineHeight: 32 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: '#13131A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitulo:     { color: '#EEEEF5', fontSize: 18, fontWeight: '800', marginBottom: 20 },
  inputLabel:      { color: '#55556A', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  input:           { backgroundColor: '#1A1A24', borderRadius: 10, padding: 12, color: '#EEEEF5', fontSize: 14, borderWidth: 1, borderColor: '#252535' },
  tempRow:         { flexDirection: 'row', gap: 8, marginTop: 6 },
  tempBtn:         { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  tempBtnText:     { fontSize: 12, fontWeight: '700' },
  modalBtns:       { flexDirection: 'row', gap: 10, marginTop: 24 },
  btnCancelar:     { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#1A1A24', borderWidth: 1, borderColor: '#252535' },
  btnCancelarText: { color: '#55556A', fontWeight: '700' },
  btnGuardar:      { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F0A020' },
  btnGuardarText:  { color: '#0A0A0F', fontWeight: '800' },
})