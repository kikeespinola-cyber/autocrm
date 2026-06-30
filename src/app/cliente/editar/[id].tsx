import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { T, tempColor, tempDim, tempTextColor, tempLabel } from '../../../lib/theme'

export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [guardando, setGuardando]     = useState(false)
  const [nombre, setNombre]           = useState('')
  const [telefono, setTelefono]       = useState('')
  const [vehiculo, setVehiculo]       = useState('')
  const [presupuesto, setPresupuesto] = useState('')
  const [trabajo, setTrabajo]         = useState('')
  const [cumple, setCumple]           = useState('')
  const [club, setClub]               = useState('')
  const [notas, setNotas]             = useState('')
  const [temp, setTemp]               = useState<'hot'|'warm'|'cold'>('warm')

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    const { data } = await supabase.from('clients').select('*').eq('id', id).single()
    if (data) {
      setNombre(data.name || '')
      setTelefono(data.phone || '')
      setVehiculo(data.vehicle_interest || '')
      setPresupuesto(data.budget || '')
      setTrabajo(data.job || '')
      setCumple(data.birthday || '')
      setClub(data.club || '')
      setNotas(data.notes || '')
      setTemp(data.temperature || 'warm')
    }
  }

  async function guardar() {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio')
      return
    }
    setGuardando(true)
    try {
      await supabase.from('clients').update({
        name: nombre.trim(),
        phone: telefono.trim() || null,
        vehicle_interest: vehiculo.trim() || null,
        budget: presupuesto.trim() || null,
        job: trabajo.trim() || null,
        birthday: cumple.trim() || null,
        club: club.trim() || null,
        notes: notas.trim() || null,
        temperature: temp,
      }).eq('id', id)
      router.back()
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelBtn}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Editar cliente</Text>
        <TouchableOpacity onPress={guardar} disabled={guardando}>
          <Text style={styles.guardarBtn}>{guardando ? 'Guardando...' : 'Guardar'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {[
          { label:'Nombre *',            value:nombre,      set:setNombre,      placeholder:'Carlos Mendoza' },
          { label:'Teléfono',            value:telefono,    set:setTelefono,    placeholder:'0981 234 567' },
          { label:'Vehículo de interés', value:vehiculo,    set:setVehiculo,    placeholder:'Toyota Hilux 2024' },
          { label:'Presupuesto',         value:presupuesto, set:setPresupuesto, placeholder:'180.000.000' },
          { label:'Trabajo / Rubro',     value:trabajo,     set:setTrabajo,     placeholder:'Transportista...' },
          { label:'Cumpleaños',          value:cumple,      set:setCumple,      placeholder:'14 Jul' },
          { label:'Club de fútbol',      value:club,        set:setClub,        placeholder:'Olimpia, Cerro...' },
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

        <Text style={styles.inputLabel}>Notas</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Notas adicionales..."
          placeholderTextColor={T.muted}
          value={notas}
          onChangeText={setNotas}
          multiline
        />

        <Text style={styles.inputLabel}>Temperatura</Text>
        <View style={styles.tempRow}>
          {(['hot','warm','cold'] as const).map(t => (
            <TouchableOpacity key={t} onPress={() => setTemp(t)}
              style={[styles.tempBtn, {
                backgroundColor: temp === t ? tempColor(t) : tempDim(t),
                borderColor: tempColor(t) + '80',
              }]}>
              <Text style={[styles.tempBtnText, { color: temp === t ? '#fff' : tempTextColor(t) }]}>
                {tempLabel(t)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: T.bg },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: T.white, borderBottomWidth: 0.5, borderBottomColor: T.border },
  cancelBtn:   { color: T.muted, fontSize: 14, fontWeight: '600' },
  titulo:      { color: T.text, fontSize: 16, fontWeight: '800' },
  guardarBtn:  { color: T.accent, fontSize: 14, fontWeight: '800' },
  content:     { padding: 20, paddingBottom: 60 },
  inputLabel:  { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 16 },
  input:       { backgroundColor: T.white, borderRadius: 10, padding: 12, color: T.text, fontSize: 14, borderWidth: 0.5, borderColor: T.border },
  tempRow:     { flexDirection: 'row', gap: 8, marginTop: 6 },
  tempBtn:     { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  tempBtnText: { fontSize: 12, fontWeight: '700' },
})