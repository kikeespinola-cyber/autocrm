import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

const SLIDES = [
  {
    icon: '⚡',
    titulo: 'Tu día, priorizado',
    texto: 'Vendix te dice exactamente a quién contactar hoy y por qué. Sin pensarlo, sin perder tiempo.',
  },
  {
    icon: '✦',
    titulo: 'IA que sugiere qué decir',
    texto: 'Cada cliente tiene una sugerencia personalizada y un mensaje listo para copiar a WhatsApp.',
  },
  {
    icon: '🔴',
    titulo: 'Hot, Warm, Cold',
    texto: 'La temperatura de tus clientes cambia sola según el tiempo sin contacto. Vos enfocate en vender.',
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [paso, setPaso] = useState(0)

  async function finalizar() {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('subscriptions')
      .update({ onboarding_completado: true })
      .eq('user_id', user?.id)
    router.replace('/')
  }

  function siguiente() {
    if (paso < SLIDES.length - 1) {
      setPaso(paso + 1)
    } else {
      finalizar()
    }
  }

  const slide = SLIDES[paso]

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={finalizar}>
        <Text style={styles.skipText}>Saltar</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>{slide.icon}</Text>
        </View>
        <Text style={styles.titulo}>{slide.titulo}</Text>
        <Text style={styles.texto}>{slide.texto}</Text>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === paso && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.btnSiguiente} onPress={siguiente}>
        <Text style={styles.btnSiguienteText}>
          {paso < SLIDES.length - 1 ? 'Siguiente' : 'Empezar'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: T.bg, padding: 28, justifyContent: 'space-between' },
  skip:             { alignSelf: 'flex-end', marginTop: 40 },
  skipText:         { color: T.muted, fontSize: 13, fontWeight: '600' },
  content:          { alignItems: 'center', flex: 1, justifyContent: 'center' },
  iconBox:          { width: 88, height: 88, borderRadius: 24, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  icon:             { fontSize: 40 },
  titulo:           { fontSize: 24, fontWeight: '800', color: T.text, textAlign: 'center', marginBottom: 14, letterSpacing: -0.5 },
  texto:            { fontSize: 15, color: T.textSub, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  dots:             { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot:              { width: 8, height: 8, borderRadius: 4, backgroundColor: T.border },
  dotActive:        { backgroundColor: T.accent, width: 24 },
  btnSiguiente:     { backgroundColor: T.accent, borderRadius: 14, padding: 18, alignItems: 'center' },
  btnSiguienteText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})