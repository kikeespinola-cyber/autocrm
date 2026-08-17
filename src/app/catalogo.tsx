import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, Alert, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { elegirImagen, subirImagen } from '../lib/imagenService'
import { extraerColorDeImagen } from '../lib/colorService'
import { useToast } from '../components/Toast'
import { mensajeError } from '../lib/errores'

const NEGRO = '#1A1A2E'

export default function CatalogoScreen() {
  const router = useRouter()
  const { mostrarToast } = useToast()
  const [vehiculos, setVehiculos]     = useState<any[]>([])
  const [modal, setModal]             = useState(false)
  const [guardando, setGuardando]     = useState(false)
  const [subiendo, setSubiendo]       = useState(false)
  const [nombre, setNombre]           = useState('')
  const [version, setVersion]         = useState('')
  const [precio, setPrecio]           = useState('')
  const [anio, setAnio]               = useState('')
  const [motor, setMotor]             = useState('')
  const [transmision, setTransmision] = useState('')
  const [fotoUrl, setFotoUrl]         = useState('')
  const [colorFondo, setColorFondo]   = useState('#E1F5EE')
  const [colorTexto, setColorTexto]   = useState('#04342C')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('vehiculos_catalogo')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
    if (data) setVehiculos(data)
  }

  function limpiar() {
    setNombre(''); setVersion(''); setPrecio(''); setAnio('')
    setMotor(''); setTransmision(''); setFotoUrl('')
    setColorFondo('#E1F5EE'); setColorTexto('#04342C')
  }

  async function subirFoto() {
    const asset = await elegirImagen([4, 3])
    if (!asset) return
    setSubiendo(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const url = await subirImagen(asset, 'catalogo', `${user?.id}/${Date.now()}`)
      setFotoUrl(url)
      const colores = await extraerColorDeImagen(url)
      setColorFondo(colores.fondo)
      setColorTexto(colores.texto)
    } catch (e) {
      mostrarToast(mensajeError(e), 'error')
    } finally {
      setSubiendo(false)
    }
  }

  async function guardar() {
    if (!nombre.trim() || !fotoUrl) {
      mostrarToast('El nombre y la foto son obligatorios', 'error')
      return
    }
    if (precio && (isNaN(parseInt(precio)) || parseInt(precio) < 0)) {
      mostrarToast('El precio debe ser un número válido', 'error')
      return
    }
    if (anio && (isNaN(parseInt(anio)) || parseInt(anio) < 1990 || parseInt(anio) > 2100)) {
      mostrarToast('Ingresá un año válido', 'error')
      return
    }
    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('vehiculos_catalogo').insert({
        user_id: user?.id,
        nombre: nombre.trim(),
        version: version.trim() || null,
        precio: precio ? parseInt(precio) : null,
        anio: anio.trim() || null,
        motor: motor.trim() || null,
        transmision: transmision.trim() || null,
        foto_url: fotoUrl,
        color_dominante: colorFondo,
        color_texto: colorTexto,
      })
      limpiar(); setModal(false); await cargar()
      mostrarToast('Vehículo agregado', 'success')
    } catch (e) {
      mostrarToast(mensajeError(e), 'error')
    } finally {
      setGuardando(false)
    }
  }

  function eliminar(id: string) {
    Alert.alert(
      '¿Eliminar este vehículo?',
      'Se va a quitar de tu catálogo. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('vehiculos_catalogo').delete().eq('id', id)
            await cargar()
            mostrarToast('Vehículo eliminado', 'info')
          },
        },
      ]
    )
  }

  function generarAnuncio(v: any) {
    router.push({
      pathname: '/anuncios',
      params: {
        vehiculo: `${v.nombre} ${v.version || ''}`.trim(),
        precio: v.precio ? `Gs. ${v.precio.toLocaleString('es-PY')}` : '',
      }
    })
  }

  function formatGs(n: number) {
    return 'Gs. ' + n.toLocaleString('es-PY')
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.titulo}>Mi catálogo</Text>
            <Text style={styles.sub}>
              {vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {vehiculos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-sport-outline" size={44} color={T.muted} />
            <Text style={styles.emptyText}>Tu catálogo está vacío</Text>
            <Text style={styles.emptySub}>Tocá el + para agregar tu primer vehículo</Text>
          </View>
        ) : vehiculos.map(v => (
          <View key={v.id} style={styles.card}>
            <View style={[styles.cardTop, { backgroundColor: v.color_dominante }]}>
              <View style={styles.cardTopInfo}>
                <Text style={[styles.cardNombre, { color: v.color_texto }]} numberOfLines={1}>
                  {v.nombre}
                </Text>
                {v.version && (
                  <Text style={[styles.cardVersion, { color: v.color_texto }]} numberOfLines={1}>
                    {v.version}
                  </Text>
                )}
                <View style={styles.cardSpecs}>
                  {v.anio && (
                    <View style={styles.specItem}>
                      <Ionicons name="calendar-outline" size={12} color={v.color_texto} />
                      <Text style={[styles.spec, { color: v.color_texto }]}>{v.anio}</Text>
                    </View>
                  )}
                  {v.motor && (
                    <View style={styles.specItem}>
                      <Ionicons name="speedometer-outline" size={12} color={v.color_texto} />
                      <Text style={[styles.spec, { color: v.color_texto }]}>{v.motor}</Text>
                    </View>
                  )}
                  {v.transmision && (
                    <View style={styles.specItem}>
                      <Ionicons name="settings-outline" size={12} color={v.color_texto} />
                      <Text style={[styles.spec, { color: v.color_texto }]}>{v.transmision}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Image source={{ uri: v.foto_url }} style={styles.cardFoto} resizeMode="contain" />
            </View>

            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.precioLabel}>Precio</Text>
                <Text style={styles.precioValor}>{v.precio ? formatGs(v.precio) : '—'}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => eliminar(v.id)} style={styles.iconBtn} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={16} color={T.red} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.anuncioBtn} onPress={() => generarAnuncio(v)} activeOpacity={0.85}>
                  <Ionicons name="sparkles" size={14} color="#fff" />
                  <Text style={styles.anuncioBtnText}>Generar anuncio</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => { limpiar(); setModal(true) }} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitulo}>Nuevo vehículo</Text>

              <TouchableOpacity style={styles.fotoUpload} onPress={subirFoto} activeOpacity={0.8}>
                {fotoUrl ? (
                  <View style={[styles.fotoPreview, { backgroundColor: colorFondo }]}>
                    <Image source={{ uri: fotoUrl }} style={styles.fotoPreviewImg} resizeMode="contain" />
                    <View style={styles.fotoCambiar}>
                      <Ionicons name={subiendo ? 'hourglass-outline' : 'camera'} size={13} color="#fff" />
                      <Text style={styles.fotoCambiarText}>
                        {subiendo ? 'Subiendo...' : 'Cambiar foto'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.fotoVacia}>
                    <Ionicons name={subiendo ? 'hourglass-outline' : 'camera-outline'} size={30} color={T.muted} />
                    <Text style={styles.fotoVaciaTitulo}>
                      {subiendo ? 'Subiendo...' : 'Subir foto del vehículo *'}
                    </Text>
                    <Text style={styles.fotoVaciaSub}>Recomendado: fondo blanco o transparente</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput style={styles.input} placeholder="Ej: Toyota Hilux" placeholderTextColor={T.muted} value={nombre} onChangeText={setNombre} />

              <Text style={styles.inputLabel}>Versión</Text>
              <TextInput style={styles.input} placeholder="Ej: SRX 4x4 Automática" placeholderTextColor={T.muted} value={version} onChangeText={setVersion} />

              <Text style={styles.inputLabel}>Precio (Gs.)</Text>
              <TextInput style={styles.input} placeholder="Ej: 320000000" placeholderTextColor={T.muted} value={precio} onChangeText={setPrecio} keyboardType="numeric" />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Año</Text>
                  <TextInput style={styles.input} placeholder="2024" placeholderTextColor={T.muted} value={anio} onChangeText={setAnio} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Motor</Text>
                  <TextInput style={styles.input} placeholder="2.8 TDI" placeholderTextColor={T.muted} value={motor} onChangeText={setMotor} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Transmisión</Text>
              <TextInput style={styles.input} placeholder="Ej: Automática 4x4" placeholderTextColor={T.muted} value={transmision} onChangeText={setTransmision} />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => { limpiar(); setModal(false) }}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={guardando}>
                  {guardando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnGuardarText}>Guardar vehículo</Text>
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
  header:          { marginBottom: 18 },
  titulo:          { color: NEGRO, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  sub:             { color: T.muted, fontSize: 13, marginTop: 3, fontWeight: '500' },

  empty:           { alignItems: 'center', marginTop: 70, gap: 9 },
  emptyText:       { color: NEGRO, fontSize: 16, fontWeight: '700' },
  emptySub:        { color: T.muted, fontSize: 13 },

  card:            { backgroundColor: T.white, borderRadius: 18, overflow: 'hidden', marginBottom: 14, borderWidth: 0.5, borderColor: T.border },
  cardTop:         { flexDirection: 'row', padding: 16, minHeight: 118, alignItems: 'center' },
  cardTopInfo:     { flex: 1 },
  cardNombre:      { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  cardVersion:     { fontSize: 13, marginTop: 2, opacity: 0.85 },
  cardSpecs:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  specItem:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spec:            { fontSize: 11, fontWeight: '600' },
  cardFoto:        { width: 125, height: 85 },

  cardBottom:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  precioLabel:     { color: T.muted, fontSize: 11 },
  precioValor:     { color: NEGRO, fontSize: 15, fontWeight: '800', marginTop: 2, letterSpacing: -0.2 },
  cardActions:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  anuncioBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: NEGRO, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11 },
  anuncioBtnText:  { color: '#fff', fontSize: 12, fontWeight: '800' },

  fab:             { position: 'absolute', bottom: 26, right: 22, width: 58, height: 58, borderRadius: 29, backgroundColor: NEGRO, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },

  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: T.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 12, paddingBottom: 40 },
  modalHandle:     { width: 38, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 18 },
  modalTitulo:     { color: NEGRO, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 16 },

  fotoUpload:      { marginBottom: 4 },
  fotoPreview:     { borderRadius: 14, height: 150, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  fotoPreviewImg:  { width: 190, height: 115 },
  fotoCambiar:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  fotoCambiarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  fotoVacia:       { borderRadius: 14, height: 150, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderStyle: 'dashed' },
  fotoVaciaTitulo: { color: T.textSub, fontSize: 13.5, fontWeight: '600' },
  fotoVaciaSub:    { color: T.muted, fontSize: 11 },

  inputLabel:      { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 7, marginTop: 14 },
  input:           { backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: NEGRO, fontSize: 14, borderWidth: 0.5, borderColor: T.border },

  modalBtns:       { flexDirection: 'row', gap: 10, marginTop: 26 },
  btnCancelar:     { flex: 1, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText: { color: T.textSub, fontWeight: '700', fontSize: 14 },
  btnGuardar:      { flex: 1.4, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: NEGRO },
  btnGuardarText:  { color: '#fff', fontWeight: '800', fontSize: 14 },
})
