import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME } from '../lib/marca'

const NEGRO = '#1A1A2E'

const SLIDES = [
  {
    icon: 'flash',
    color: '#F59E0B',
    titulo: 'Tu día, priorizado',
    texto: `${APP_NAME} te dice exactamente a quién contactar hoy y por qué. Sin pensarlo, sin perder tiempo.`,
  },
  {
    icon: 'sparkles',
    color: '#04dedf',
    titulo: 'IA que sugiere qué decir',
    texto: 'Cada cliente tiene una sugerencia personalizada y un mensaje listo para copiar a WhatsApp.',
  },
  {
    icon: 'thermometer',
    color: '#EF4444',
    titulo: 'Hot, Warm, Cold',
    texto: 'La temperatura de tus clientes cambia sola según el tiempo sin contacto. Vos enfocate en vender.',
  },
  {
    icon: 'megaphone',
    color: '#8B5CF6',
    titulo: 'Tu catálogo y tus pautas',
    texto: 'Cargá tus vehículos, generá anuncios con IA y medí cuánto te cuesta cada venta en redes.',
  },
]

// El último paso (índice = SLIDES.length) es la configuración del perfil
const TOTAL_PASOS = SLIDES.length + 1

export default function OnboardingScreen() {
  const router = useRouter()
  const [paso, setPaso] = useState(0)
  const [guardando, setGuardando] = useState(false)

  // Datos del perfil
  const [nombre, setNombre]             = useState('')
  const [concesionaria, setConcesionaria] = useState('')
  const [marca, setMarca]               = useState('')

  async function finalizar(conDatos: boolean) {
    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updates: any = { onboarding_completado: true }
      if (conDatos) {
        if (nombre.trim())        updates.nombre_vendedor = nombre.trim()
        if (concesionaria.trim()) updates.concesionaria = concesionaria.trim()
        if (marca.trim())         updates.marca_vehiculo = marca.trim()
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('user_id', user.id)
      if (error) console.error('Error onboarding:', error)
    } catch (e) {
      console.error(e)
    } finally {
      setGuardando(false)
      router.replace('/')
    }
  }

  function siguiente() {
    if (paso < TOTAL_PASOS - 1) {
      setPaso(paso + 1)
    } else {
      finalizar(true)
    }
  }

  function atras() {
    if (paso > 0) setPaso(paso - 1)
  }

  const esConfig = paso === SLIDES.length
  const slide    = !esConfig ? SLIDES[paso] : null

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        {paso > 0 ? (
          <TouchableOpacity onPress={atras} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={T.textSub} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}

        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoLetter}>V</Text>
          </View>
          <Text style={styles.logoText}>{APP_NAME}</Text>
        </View>

        {!esConfig ? (
          <TouchableOpacity onPress={() => finalizar(false)} style={styles.headerBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {!esConfig ? (
        <View style={styles.content}>
          <View style={[styles.iconBox, { backgroundColor: slide!.color + '18' }]}>
            <Ionicons name={slide!.icon as any} size={42} color={slide!.color} />
          </View>
          <Text style={styles.titulo}>{slide!.titulo}</Text>
          <Text style={styles.texto}>{slide!.texto}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.configContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.iconBox, { backgroundColor: T.accentDim, marginBottom: 20 }]}>
            <Ionicons name="person-circle" size={42} color={T.accentText} />
          </View>
          <Text style={styles.titulo}>Personalizá tu {APP_NAME}</Text>
          <Text style={styles.texto}>Contanos quién sos para adaptar la app a tu trabajo. Podés cambiarlo después.</Text>

          <View style={styles.form}>
            <Text style={styles.inputLabel}>Tu nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Carlos Mendoza"
              placeholderTextColor={T.muted}
              value={nombre}
              onChangeText={setNombre}
            />

            <Text style={styles.inputLabel}>Concesionaria</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Toyotoshi"
              placeholderTextColor={T.muted}
              value={concesionaria}
              onChangeText={setConcesionaria}
            />

            <Text style={styles.inputLabel}>Marca que vendés</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Toyota"
              placeholderTextColor={T.muted}
              value={marca}
              onChangeText={setMarca}
            />
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === paso && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity
          style={styles.btnSiguiente}
          onPress={siguiente}
          disabled={guardando}
          activeOpacity={0.85}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.btnSiguienteText}>
                {esConfig ? 'Empezar a vender' : 'Siguiente'}
              </Text>
              <Ionicons name={esConfig ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: T.bg, paddingHorizontal: 26, paddingBottom: 34 },

  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56 },
  headerBtn:        { minWidth: 52, paddingVertical: 6 },
  skipText:         { color: T.muted, fontSize: 13.5, fontWeight: '600', textAlign: 'right' },
  logoRow:          { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoIcon:         { width: 26, height: 26, borderRadius: 7, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  logoLetter:       { color: '#fff', fontSize: 13, fontWeight: '900' },
  logoText:         { fontSize: 16, fontWeight: '800', color: NEGRO, letterSpacing: -0.3 },

  content:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 30 },
  configContent:    { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  iconBox:          { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  titulo:           { fontSize: 26, fontWeight: '800', color: NEGRO, textAlign: 'center', marginBottom: 14, letterSpacing: -0.7 },
  texto:            { fontSize: 15, color: T.textSub, textAlign: 'center', lineHeight: 23, paddingHorizontal: 10 },

  form:             { alignSelf: 'stretch', marginTop: 26 },
  inputLabel:       { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 7, marginTop: 14 },
  input:            { backgroundColor: T.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, color: NEGRO, fontSize: 15, borderWidth: 0.5, borderColor: T.border },

  footer:           { gap: 22, paddingTop: 10 },
  dots:             { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot:              { width: 8, height: 8, borderRadius: 4, backgroundColor: T.border },
  dotActive:        { backgroundColor: NEGRO, width: 26 },

  btnSiguiente:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: NEGRO, borderRadius: 15, paddingVertical: 18 },
  btnSiguienteText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
