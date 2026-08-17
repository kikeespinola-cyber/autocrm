import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME, APP_FOOTER, WHATSAPP_NUMERO } from '../lib/marca'

const NEGRO = '#1A1A2E'

const BENEFICIOS = [
  { icon: 'people',        titulo: 'Clientes ilimitados',      sub: 'Toda tu cartera organizada en un solo lugar' },
  { icon: 'sparkles',      titulo: 'IA que vende por vos',      sub: 'Sugerencias y mensajes listos para cada cliente' },
  { icon: 'git-branch',    titulo: 'Pipeline automático',       sub: 'Hot, Warm y Cold — nunca se te enfría un lead' },
  { icon: 'car-sport',     titulo: 'Catálogo de vehículos',     sub: 'Tus autos a mano para cotizar al instante' },
  { icon: 'megaphone',     titulo: 'Anuncios con IA',           sub: 'Publicaciones para redes en segundos' },
  { icon: 'document-text', titulo: 'Reportes de cierre',        sub: 'Tus números del mes en un PDF profesional' },
]

const RAZONES = [
  'Una sola venta extra al año paga la app muchas veces',
  'Ningún cliente se pierde por falta de seguimiento',
  'Ahorrás horas de trabajo manual cada semana',
]

const PLANES = [
  { key: 'mensual', nombre: 'Mensual', precio: 'Gs. 50.000', periodo: '/mes', destacado: false, ahorro: null, nota: 'Ideal para arrancar' },
  { key: 'anual',   nombre: 'Anual',   precio: 'Gs. 500.000', periodo: '/año', destacado: true,  ahorro: '2 meses gratis', nota: 'Pagás 10 meses, usás 12' },
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

  function contratar(planNombre: string) {
    const mensaje = `Hola, soy ${nombre} (${email}). Quiero activar el plan ${planNombre.toLowerCase()} de ${APP_NAME}.`
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={NEGRO} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planes</Text>
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

        {/* Planes */}
        <Text style={styles.sectionLabel}>ELEGÍ TU PLAN</Text>
        {PLANES.map(p => (
          <View key={p.key} style={[styles.planCard, p.destacado && styles.planDestacado]}>
            {p.destacado && (
              <View style={styles.badgeMejor}>
                <Ionicons name="star" size={11} color="#fff" />
                <Text style={styles.badgeMejorText}>MÁS ELEGIDO · AHORRÁS 16%</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planNombre}>{p.nombre}</Text>
                <Text style={styles.planNota}>{p.nota}</Text>
                {p.ahorro && (
                  <View style={styles.ahorroTag}>
                    <Ionicons name="gift" size={11} color={T.green} />
                    <Text style={styles.ahorroText}>{p.ahorro}</Text>
                  </View>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.planPrecio}>{p.precio}</Text>
                <Text style={styles.planPeriodo}>{p.periodo}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.planBtn, p.destacado ? styles.planBtnDestacado : styles.planBtnNormal]}
              onPress={() => contratar(p.nombre)}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={17} color={p.destacado ? '#fff' : NEGRO} />
              <Text style={[styles.planBtnText, { color: p.destacado ? '#fff' : NEGRO }]}>
                Contratar {p.nombre.toLowerCase()}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={17} color={T.accentText} />
          <Text style={styles.infoText}>
            Al tocar "Contratar" se abre WhatsApp para coordinar el pago por transferencia. Apenas lo confirmamos, activamos tu plan al instante — sin perder nada de tu información.
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

  planCard:        { backgroundColor: T.white, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: T.border },
  planDestacado:   { borderColor: NEGRO, borderWidth: 2 },
  badgeMejor:      { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: NEGRO, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, marginBottom: 12 },
  badgeMejorText:  { color: '#fff', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
  planHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  planNombre:      { color: NEGRO, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  planNota:        { color: T.muted, fontSize: 12, marginTop: 2 },
  ahorroTag:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.green + '18', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  ahorroText:      { color: T.green, fontSize: 11, fontWeight: '700' },
  planPrecio:      { color: NEGRO, fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },
  planPeriodo:     { color: T.muted, fontSize: 12, marginTop: 1 },
  planBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 15 },
  planBtnNormal:   { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
  planBtnDestacado:{ backgroundColor: NEGRO },
  planBtnText:     { fontSize: 14.5, fontWeight: '800' },

  infoBox:         { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: T.accentDim, borderRadius: 14, padding: 14, marginTop: 6, borderWidth: 0.5, borderColor: T.accent + '33' },
  infoText:        { color: T.accentText, fontSize: 12.5, lineHeight: 18, flex: 1 },

  footer:          { textAlign: 'center', color: T.muted, fontSize: 12, marginTop: 26, fontWeight: '500' },
})
