import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME, APP_FOOTER, WHATSAPP_NUMERO } from '../lib/marca'

const NEGRO = '#1A1A2E'

// Sin precios ni link a planes: el único camino es escribirnos por WhatsApp.
// La activación se coordina y se cobra por fuera de la app.

const BENEFICIOS = [
  { icon: 'people',          texto: 'Todos tus clientes y datos guardados' },
  { icon: 'sparkles',        texto: 'Sugerencias con IA personalizadas' },
  { icon: 'git-branch',      texto: 'Pipeline Hot/Warm/Cold automático' },
  { icon: 'car-sport',       texto: 'Catálogo de vehículos' },
  { icon: 'megaphone',       texto: 'Generador de anuncios para redes' },
  { icon: 'document-text',   texto: 'Reporte PDF de cierre de mes' },
]

export default function TrialVencidoScreen() {
  const [nombre, setNombre] = useState('Vendedor')
  const [email, setEmail]   = useState('')

  useEffect(() => { cargar() }, [])

  // Sin esto el mensaje llega sin remitente y hay que preguntar quién escribe.
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
    const mensaje = `Hola, soy ${nombre} (${email}). Mi prueba de ${APP_NAME} terminó y quiero activar mi cuenta.`
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.iconBox}>
        <Ionicons name="time-outline" size={42} color={T.warm} />
      </View>

      <Text style={styles.titulo}>Tu prueba terminó</Text>
      <Text style={styles.sub}>
        Tus 14 días gratuitos finalizaron. Escribinos y activamos tu cuenta para que sigas usando {APP_NAME} sin perder nada de tu historial.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>SEGUÍ APROVECHANDO</Text>
        {BENEFICIOS.map((b, i) => (
          <View key={b.texto} style={[styles.beneficio, i === BENEFICIOS.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={styles.beneficioIcon}>
              <Ionicons name={b.icon as any} size={15} color={T.accentText} />
            </View>
            <Text style={styles.beneficioText}>{b.texto}</Text>
            <Ionicons name="checkmark-circle" size={16} color={T.green} />
          </View>
        ))}
      </View>

      <View style={styles.avisoBox}>
        <Ionicons name="shield-checkmark-outline" size={16} color={T.green} />
        <Text style={styles.avisoText}>
          Tus datos están guardados y seguros. Cuando activamos tu cuenta recuperás todo tal como lo dejaste.
        </Text>
      </View>

      <TouchableOpacity style={styles.btnPrincipal} onPress={escribirnos} activeOpacity={0.85}>
        <Ionicons name="logo-whatsapp" size={19} color="#fff" />
        <Text style={styles.btnPrincipalText}>Escribinos para activar tu cuenta</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecundario} onPress={cerrarSesion} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={17} color={T.muted} />
        <Text style={styles.btnSecundarioText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>{APP_FOOTER}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: T.bg },
  content:           { flexGrow: 1, justifyContent: 'center', padding: 26, paddingVertical: 50 },

  iconBox:           { width: 82, height: 82, borderRadius: 26, backgroundColor: T.warmDim, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 22 },

  titulo:            { color: NEGRO, fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.6, marginBottom: 10 },
  sub:               { color: T.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 6 },

  card:              { backgroundColor: T.white, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 0.5, borderColor: T.border },
  cardLabel:         { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 6 },
  beneficio:         { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: T.border },
  beneficioIcon:     { width: 30, height: 30, borderRadius: 10, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center' },
  beneficioText:     { color: NEGRO, fontSize: 13, fontWeight: '500', flex: 1 },

  avisoBox:          { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: T.greenDim, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 0.5, borderColor: T.green + '33' },
  avisoText:         { color: T.greenText, fontSize: 12, lineHeight: 18, flex: 1 },

  btnPrincipal:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#25D366', borderRadius: 15, paddingVertical: 17, marginBottom: 10 },
  btnPrincipalText:  { color: '#fff', fontSize: 16, fontWeight: '800' },

  btnSecundario:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: T.white, borderRadius: 15, paddingVertical: 16, borderWidth: 0.5, borderColor: T.border },
  btnSecundarioText: { color: T.muted, fontSize: 14, fontWeight: '600' },

  footer:            { textAlign: 'center', color: T.muted, fontSize: 11.5, marginTop: 24, fontWeight: '500' },
})
