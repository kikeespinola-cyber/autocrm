import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { T } from '../lib/theme'
import { supabase } from '../lib/supabase'
import * as Clipboard from 'expo-clipboard'

const NEGRO = '#1A1A2E'

const REDES = [
  { key: 'facebook',  label: 'Facebook',  icon: 'logo-facebook',  color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E1306C' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: 'logo-whatsapp',  color: '#25D366' },
]

const OBJETIVOS = [
  { key: 'venta',      label: 'Venta directa',     icon: 'trophy-outline' },
  { key: 'consulta',   label: 'Generar consulta',  icon: 'chatbubble-outline' },
  { key: 'test_drive', label: 'Test drive',        icon: 'car-sport-outline' },
  { key: 'financ',     label: 'Financiamiento',    icon: 'cash-outline' },
]

export default function AnunciosScreen() {
  const params = useLocalSearchParams<{ vehiculo?: string; precio?: string }>()
  const [vehiculo, setVehiculo]   = useState('')
  const [precio, setPrecio]       = useState('')
  const [red, setRed]             = useState<string | null>(null)
  const [objetivo, setObjetivo]   = useState<string | null>(null)
  const [extra, setExtra]         = useState('')
  const [anuncio, setAnuncio]     = useState('')
  const [cargando, setCargando]   = useState(false)
  const [copiado, setCopiado]     = useState<string | null>(null)
  const [historial, setHistorial] = useState<any[]>([])
  const [verHistorial, setVerHistorial] = useState(false)

  useEffect(() => { cargarHistorial() }, [])

  // Precarga desde el catálogo
  useEffect(() => {
    if (params.vehiculo) setVehiculo(String(params.vehiculo))
    if (params.precio)   setPrecio(String(params.precio))
  }, [params.vehiculo, params.precio])

  async function cargarHistorial() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('anuncios_historial')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistorial(data)
  }

  async function generarAnuncio() {
    if (!vehiculo.trim()) return
    setCargando(true)
    setAnuncio('')

    const redLabel = REDES.find(r => r.key === red)?.label || 'redes sociales'
    const objLabel = OBJETIVOS.find(o => o.key === objetivo)?.label || 'generar consulta'

    const prompt = `Sos un experto en marketing automotriz en Paraguay. Generá un anuncio para ${redLabel} con el objetivo de ${objLabel}.

Vehículo: ${vehiculo}
${precio ? `Precio/Financiamiento: ${precio}` : ''}
${extra ? `Información adicional: ${extra}` : ''}

El anuncio debe:
- Ser atractivo y directo
- Usar emojis apropiados
- Incluir un call to action claro
- Estar en español paraguayo natural
- Ser breve pero impactante (máximo 200 palabras)
- Terminar con una forma de contacto genérica

Respondé SOLO con el texto del anuncio, sin explicaciones ni comentarios adicionales.`

    try {
      const { data, error } = await supabase.functions.invoke('sugerencia-ia', {
        body: {
          nombre: 'Anuncio',
          vehiculo,
          temperatura: 'hot',
          contactos: 0,
          historial: [],
          promptPersonalizado: prompt,
        }
      })
      if (error) throw error
      const texto = data?.sugerencia || 'No se pudo generar el anuncio.'
      setAnuncio(texto)

      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('anuncios_historial').insert({
        user_id: user?.id,
        vehiculo: vehiculo.trim(),
        red: red || null,
        objetivo: objetivo || null,
        texto,
      })
      await cargarHistorial()
    } catch (e) {
      setAnuncio('Error al generar el anuncio. Intentá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  function copiar(texto: string, id: string) {
    {
      Clipboard.setStringAsync(texto)
      setCopiado(id)
      setTimeout(() => setCopiado(null), 2000)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Generador de anuncios</Text>
          <Text style={styles.sub}>Creá el texto perfecto para tu pauta</Text>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !verHistorial && styles.toggleBtnActivo]}
          onPress={() => setVerHistorial(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={15} color={!verHistorial ? '#fff' : T.textSub} />
          <Text style={[styles.toggleText, !verHistorial && styles.toggleTextActivo]}>Nuevo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, verHistorial && styles.toggleBtnActivo]}
          onPress={() => setVerHistorial(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={15} color={verHistorial ? '#fff' : T.textSub} />
          <Text style={[styles.toggleText, verHistorial && styles.toggleTextActivo]}>
            Historial
          </Text>
          <View style={[styles.toggleCount, verHistorial && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={[styles.toggleCountText, verHistorial && { color: '#fff' }]}>{historial.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {verHistorial ? (
        <>
          {historial.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={40} color={T.muted} />
              <Text style={styles.emptyText}>Sin anuncios todavía</Text>
              <Text style={styles.emptySub}>Generá tu primer anuncio con IA</Text>
            </View>
          ) : historial.map(h => {
            const redInfo = REDES.find(r => r.key === h.red)
            const objInfo = OBJETIVOS.find(o => o.key === h.objetivo)
            return (
              <View key={h.id} style={styles.historialCard}>
                <View style={styles.historialHeader}>
                  <Text style={styles.historialVehiculo} numberOfLines={1}>{h.vehiculo}</Text>
                  <Text style={styles.historialFecha}>
                    {new Date(h.created_at).toLocaleDateString('es-PY')}
                  </Text>
                </View>
                {redInfo && (
                  <View style={styles.historialMeta}>
                    <Ionicons name={redInfo.icon as any} size={12} color={redInfo.color} />
                    <Text style={[styles.historialMetaText, { color: redInfo.color }]}>{redInfo.label}</Text>
                    {objInfo && (
                      <>
                        <Text style={styles.historialSep}>·</Text>
                        <Text style={styles.historialMetaText}>{objInfo.label}</Text>
                      </>
                    )}
                  </View>
                )}
                <Text style={styles.historialTexto} numberOfLines={3}>{h.texto}</Text>
                <TouchableOpacity
                  style={styles.historialCopyBtn}
                  onPress={() => copiar(h.texto, h.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={copiado === h.id ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={copiado === h.id ? T.green : T.textSub}
                  />
                  <Text style={[styles.historialCopyText, copiado === h.id && { color: T.green }]}>
                    {copiado === h.id ? 'Copiado' : 'Copiar'}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>VEHÍCULO *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Toyota Hilux GR-S 2024, 4x4 automático"
            placeholderTextColor={T.muted}
            value={vehiculo}
            onChangeText={setVehiculo}
          />

          <Text style={styles.sectionLabel}>PRECIO O FINANCIAMIENTO</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Desde Gs. 180.000.000 · Entrega 20%"
            placeholderTextColor={T.muted}
            value={precio}
            onChangeText={setPrecio}
          />

          <Text style={styles.sectionLabel}>RED SOCIAL</Text>
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
                  <Ionicons name={r.icon as any} size={15} color={sel ? '#fff' : r.color} />
                  <Text style={[styles.chipText, sel && { color: '#fff' }]}>{r.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.sectionLabel}>OBJETIVO</Text>
          <View style={styles.chipsWrap}>
            {OBJETIVOS.map(o => {
              const sel = objetivo === o.key
              return (
                <TouchableOpacity
                  key={o.key}
                  onPress={() => setObjetivo(sel ? null : o.key)}
                  style={[styles.chip, sel && { backgroundColor: NEGRO, borderColor: NEGRO }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name={o.icon as any} size={15} color={sel ? '#fff' : T.textSub} />
                  <Text style={[styles.chipText, sel && { color: '#fff' }]}>{o.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.sectionLabel}>ALGO MÁS QUE AGREGAR</Text>
          <TextInput
            style={[styles.input, { minHeight: 78, textAlignVertical: 'top' }]}
            placeholder="Ej: Color blanco perla, único dueño, service al día"
            placeholderTextColor={T.muted}
            value={extra}
            onChangeText={setExtra}
            multiline
          />

          <TouchableOpacity
            style={[styles.btnGenerar, (!vehiculo.trim() || cargando) && { opacity: 0.4 }]}
            onPress={generarAnuncio}
            disabled={cargando || !vehiculo.trim()}
            activeOpacity={0.85}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="sparkles" size={17} color="#fff" />
            )}
            <Text style={styles.btnGenerarText}>
              {cargando ? 'Generando...' : 'Generar anuncio con IA'}
            </Text>
          </TouchableOpacity>

          {anuncio ? (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="sparkles" size={13} color={T.accentText} />
                <Text style={styles.resultLabel}>ANUNCIO GENERADO</Text>
              </View>
              <Text style={styles.resultText}>{anuncio}</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => copiar(anuncio, 'result')}
                activeOpacity={0.85}
              >
                <Ionicons name={copiado === 'result' ? 'checkmark' : 'copy-outline'} size={15} color="#fff" />
                <Text style={styles.copyBtnText}>
                  {copiado === 'result' ? 'Copiado' : 'Copiar anuncio'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: T.bg },
  content:            { padding: 20, paddingTop: 24, paddingBottom: 60 },

  header:             { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  titulo:             { color: NEGRO, fontSize: 26, fontWeight: '800', letterSpacing: -0.7 },
  sub:                { color: T.muted, fontSize: 13, marginTop: 3, fontWeight: '500' },

  toggleRow:          { flexDirection: 'row', gap: 8, marginBottom: 8 },
  toggleBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 22, backgroundColor: T.white, borderWidth: 0.5, borderColor: T.border },
  toggleBtnActivo:    { backgroundColor: NEGRO, borderColor: NEGRO },
  toggleText:         { fontSize: 13, fontWeight: '600', color: T.textSub },
  toggleTextActivo:   { color: '#fff' },
  toggleCount:        { backgroundColor: T.bg, borderRadius: 10, minWidth: 21, paddingHorizontal: 5, paddingVertical: 1, alignItems: 'center' },
  toggleCountText:    { fontSize: 11, fontWeight: '800', color: T.muted },

  sectionLabel:       { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, marginTop: 18 },
  input:              { backgroundColor: T.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: NEGRO, fontSize: 14, borderWidth: 0.5, borderColor: T.border },

  chipsWrap:          { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:               { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: T.white, borderWidth: 1, borderColor: T.border },
  chipText:           { fontSize: 12.5, fontWeight: '600', color: T.textSub },

  btnGenerar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: NEGRO, borderRadius: 15, paddingVertical: 17, marginTop: 26 },
  btnGenerarText:     { color: '#fff', fontSize: 15, fontWeight: '800' },

  resultCard:         { backgroundColor: T.white, borderRadius: 16, padding: 17, marginTop: 18, borderWidth: 0.5, borderColor: T.border },
  resultHeader:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  resultLabel:        { color: T.accentText, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  resultText:         { color: NEGRO, fontSize: 14, lineHeight: 22 },
  copyBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: NEGRO, borderRadius: 12, paddingVertical: 13, marginTop: 15 },
  copyBtnText:        { color: '#fff', fontSize: 13, fontWeight: '800' },

  historialCard:      { backgroundColor: T.white, borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 0.5, borderColor: T.border },
  historialHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 7 },
  historialVehiculo:  { color: NEGRO, fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: -0.2 },
  historialFecha:     { color: T.muted, fontSize: 11 },
  historialMeta:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 9 },
  historialMetaText:  { color: T.muted, fontSize: 11.5, fontWeight: '600' },
  historialSep:       { color: T.muted, fontSize: 11 },
  historialTexto:     { color: T.textSub, fontSize: 12.5, lineHeight: 19, marginBottom: 12 },
  historialCopyBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.bg, borderRadius: 10, paddingVertical: 10 },
  historialCopyText:  { color: T.textSub, fontSize: 12, fontWeight: '700' },

  empty:              { alignItems: 'center', marginTop: 60, gap: 9 },
  emptyText:          { color: NEGRO, fontSize: 16, fontWeight: '700' },
  emptySub:           { color: T.muted, fontSize: 13 },
})
