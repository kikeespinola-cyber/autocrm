import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useState } from 'react'
import { T } from '../lib/theme'
import { supabase } from '../lib/supabase'

const REDES = [
  { key: 'facebook',  label: '📘 Facebook',  color: '#1877F2' },
  { key: 'instagram', label: '📸 Instagram', color: '#E1306C' },
  { key: 'whatsapp',  label: '💬 WhatsApp',  color: '#25D366' },
]

const OBJETIVOS = [
  { key: 'venta',      label: '🏆 Venta directa' },
  { key: 'consulta',   label: '💬 Generar consulta' },
  { key: 'test_drive', label: '🚗 Test drive' },
  { key: 'financ',     label: '💰 Financiamiento' },
]

export default function AnunciosScreen() {
  const [vehiculo, setVehiculo] = useState('')
  const [precio, setPrecio]     = useState('')
  const [red, setRed]           = useState<string | null>(null)
  const [objetivo, setObjetivo] = useState<string | null>(null)
  const [extra, setExtra]       = useState('')
  const [anuncio, setAnuncio]   = useState('')
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado]   = useState(false)

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
- Terminar con una forma de contacto genérica como "Escribinos al 📱 o visitanos en el salón"

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
      setAnuncio(data?.sugerencia || 'No se pudo generar el anuncio.')
    } catch (e) {
      setAnuncio('Error al generar el anuncio. Intentá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  function copiar() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(anuncio)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Generador de anuncios</Text>
      <Text style={styles.sub}>Creá el texto perfecto para tu pauta en redes.</Text>

      <Text style={styles.sectionLabel}>VEHÍCULO</Text>
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
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        {REDES.map(r => (
          <TouchableOpacity
            key={r.key}
            onPress={() => setRed(red === r.key ? null : r.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              backgroundColor: red === r.key ? r.color : T.bg,
              borderWidth: 1, borderColor: r.color + '80',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: red === r.key ? '#fff' : r.color }}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>OBJETIVO</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        {OBJETIVOS.map(o => (
          <TouchableOpacity
            key={o.key}
            onPress={() => setObjetivo(objetivo === o.key ? null : o.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              backgroundColor: objetivo === o.key ? T.accent : T.bg,
              borderWidth: 1, borderColor: T.accent + '80',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: objetivo === o.key ? '#fff' : T.accentText }}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>ALGO MÁS QUE AGREGAR (opcional)</Text>
      <TextInput
        style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
        placeholder="Ej: Color blanco perla, único dueño, service al día"
        placeholderTextColor={T.muted}
        value={extra}
        onChangeText={setExtra}
        multiline
      />

      <TouchableOpacity
        style={[styles.btnGenerar, (!vehiculo.trim() || cargando) && { opacity: 0.5 }]}
        onPress={generarAnuncio}
        disabled={cargando || !vehiculo.trim()}
      >
        <Text style={styles.btnGenerarText}>
          {cargando ? '✦ Generando...' : '✦ Generar anuncio con IA'}
        </Text>
      </TouchableOpacity>

      {anuncio ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>ANUNCIO GENERADO</Text>
          <Text style={styles.resultText}>{anuncio}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={copiar}>
            <Text style={styles.copyBtnText}>{copiado ? '✅ Copiado' : '📋 Copiar anuncio'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: T.bg },
  content:        { padding: 20, paddingTop: 20, paddingBottom: 60 },
  titulo:         { color: T.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sub:            { color: T.muted, fontSize: 12, marginTop: 4, marginBottom: 20, fontWeight: '500' },
  sectionLabel:   { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  input:          { backgroundColor: T.white, borderRadius: 10, padding: 12, color: T.text, fontSize: 14, borderWidth: 0.5, borderColor: T.border, marginBottom: 4 },
  btnGenerar:     { backgroundColor: T.accent, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  btnGenerarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  resultCard:     { backgroundColor: T.white, borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 0.5, borderColor: T.border },
  resultLabel:    { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  resultText:     { color: T.text, fontSize: 14, lineHeight: 22 },
  copyBtn:        { backgroundColor: T.accent, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 14 },
  copyBtnText:    { color: '#fff', fontSize: 13, fontWeight: '800' },
})