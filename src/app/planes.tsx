import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME, APP_FOOTER, WHATSAPP_NUMERO } from '../lib/marca'

const NEGRO = '#1A1A2E'

// La app se publica gratuita: el cobro se coordina 100% por fuera, por WhatsApp.
// Por eso acá no va ningún monto, plan ni botón de compra — Apple y Google
// rechazan las apps que venden desde adentro sin pasar por su facturación.

const BENEFICIOS = [
  { icon: 'people',        titulo: 'Clientes ilimitados',      sub: 'Toda tu cartera organizada en un solo lugar' },
  { icon: 'sparkles',      titulo: 'IA que vende por vos',      sub: 'Sugerencias y mensajes listos para cada cliente' },
  { icon: 'git-branch',    titulo: 'Pipeline automático',       sub: 'Hot, Warm y Cold — nunca se te enfría un lead' },
  { icon: 'car-sport',     titulo: 'Catálogo de vehículos',     sub: 'Tus autos a mano para cotizar al instante' },
  { icon: 'megaphone',     titulo: 'Anuncios con IA',           sub: 'Publicaciones para redes en segundos' },
  { icon: 'document-text', titulo: 'Reportes de cierre',        sub: 'Tus números del mes en un PDF profesional' },
]

const RAZONES = [
  'Sabés a quién contactar cada día, sin pensarlo',
  'Ningún cliente se pierde por falta de seguimiento',
  'Ahorrás horas de trabajo manual cada semana',
]

export default function PlanesScreen() {
  const router = useRouter()
  const [nombre, setNombre] = useState('Vendedor')
  const [email, setEmail]   = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email || '')
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('nombre_vendedor')
      .eq('user_id', user.id)
      .single()
    setNombre(sub?.nombre_vendedor || user.email?.split('@')[0] || 'Vendedor')
  }

  function escribirnos() {
    const mensaje = `Hola, soy ${nombre} (${email}). Quiero activar mi cuenta de ${APP_NAME}.`
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={NEGRO} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tu cuenta</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroLetter}>V</Text>
          </View>
          <Text style={styles.titulo}>Seguí vendiendo con inteligencia</Text>
          <Text style={styles.sub}>Todo lo que necesitás para no perder ninguna venta, en una sola app.</Text>
        </View>

        {/* Beneficios destacados */}
        <Text style={styles.sectionLabel}>TODO LO QUE INCLUYE</Text>
        <View style={styles.beneficiosGrid}>
          {BENEFICIOS.map(b => (
            <View key={b.titulo} style={styles.beneficioCard}>
              <View style={styles.beneficioIcon}>
                <Ionicons name={b.icon as any} size={19} color={T.accentText} />
              </View>
              <Text style={styles.beneficioTitulo}>{b.titulo}</Text>
              <Text style={styles.beneficioSub}>{b.sub}</Text>
            </View>
          ))}
        </View>

        {/* Por qué conviene */}
        <View style={styles.razonesCard}>
          <View style={styles.razonesHeader}>
            <Ionicons name="trending-up" size={18} color={T.green} />
            <Text style={styles.razonesTitulo}>Por qué te conviene</Text>
          </View>
          {RAZONES.map(r => (
            <View key={r} style={styles.razonRow}>
              <Ionicons name="checkmark-circle" size={16} color={T.green} />
              <Text style={styles.razonText}>{r}</Text>
            </View>
          ))}
        </View>

        {/* Único llamado a la acción: escribirnos */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitulo}>¿Querés seguir usando {APP_NAME}?</Text>
          <Text style={styles.ctaSub}>
            Escribinos por WhatsApp y activamos tu cuenta. Te acompañamos en todo el proceso.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={escribirnos} activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={styles.ctaBtnText}>Escribinos para activar tu cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={17} color={T.accentText} />
          <Text style={styles.infoText}>
            Te respondemos por WhatsApp y activamos tu cuenta al instante — sin perder nada de tu información.
          </Text>
        </View>

        <Text style={styles.footer}>{APP_FOOTER}</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: T.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: T.white, borderBottomWidth: 0.5, borderBottomColor: T.border },
  backBtn:         { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 17, fontWeight: '800', color: NEGRO },
  content:         { padding: 20, paddingBottom: 50 },

  hero:            { alignItems: 'center', marginBottom: 26 },
  heroIcon:        { width: 58, height: 58, borderRadius: 17, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroLetter:      { color: '#fff', fontSize: 30, fontWeight: '900' },
  titulo:          { color: NEGRO, fontSize: 24, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  sub:             { color: T.muted, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },

  sectionLabel:    { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 12, marginTop: 4 },

  beneficiosGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  beneficioCard:   { width: '47.8%', backgroundColor: T.white, borderRadius: 15, padding: 14, borderWidth: 0.5, borderColor: T.border },
  beneficioIcon:   { width: 38, height: 38, borderRadius: 11, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  beneficioTitulo: { color: NEGRO, fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  beneficioSub:    { color: T.muted, fontSize: 11.5, marginTop: 3, lineHeight: 15 },

  razonesCard:     { backgroundColor: T.greenDim, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 0.5, borderColor: T.green + '33' },
  razonesHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  razonesTitulo:   { color: T.green, fontSize: 14, fontWeight: '800' },
  razonRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 5 },
  razonText:       { color: T.greenText, fontSize: 13, flex: 1, lineHeight: 18 },

  ctaCard:         { backgroundColor: T.white, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: T.border },
  ctaTitulo:       { color: NEGRO, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  ctaSub:          { color: T.muted, fontSize: 13, marginTop: 6, lineHeight: 19, marginBottom: 16 },
  ctaBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 15, backgroundColor: '#25D366' },
  ctaBtnText:      { color: '#fff', fontSize: 14.5, fontWeight: '800' },

  infoBox:         { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: T.accentDim, borderRadius: 14, padding: 14, marginTop: 6, borderWidth: 0.5, borderColor: T.accent + '33' },
  infoText:        { color: T.accentText, fontSize: 12.5, lineHeight: 18, flex: 1 },

  footer:          { textAlign: 'center', color: T.muted, fontSize: 12, marginTop: 26, fontWeight: '500' },
})
