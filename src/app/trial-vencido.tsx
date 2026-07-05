import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

export default function TrialVencidoScreen() {

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  function contactar() {
    if (typeof window !== 'undefined') {
      window.open('https://wa.me/595985715389?text=Hola%2C%20quiero%20continuar%20usando%20Vendix', '_blank')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 48 }}>⏰</Text>
      </View>
      <Text style={styles.titulo}>Tu período de prueba terminó</Text>
      <Text style={styles.sub}>
        Tus 14 días de prueba gratuita han finalizado. Para seguir usando Vendix y no perder tu historial de clientes, activá tu plan.
      </Text>

      <View style={styles.beneficios}>
        {[
          '✅ Todos tus clientes y datos guardados',
          '✅ Sugerencia IA personalizada',
          '✅ Pipeline Hot/Warm/Cold automático',
          '✅ Reporte PDF de cierre de mes',
          '✅ Generador de anuncios para redes',
        ].map(b => (
          <Text key={b} style={styles.beneficio}>{b}</Text>
        ))}
      </View>

      <TouchableOpacity style={styles.btnPrincipal} onPress={contactar}>
        <Text style={styles.btnPrincipalText}>💬 Contactar por WhatsApp</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecundario} onPress={cerrarSesion}>
        <Text style={styles.btnSecundarioText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Vendix · Vendé con inteligencia.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: T.bg, padding: 28, justifyContent: 'center' },
  iconBox:         { alignItems: 'center', marginBottom: 20 },
  titulo:          { color: T.text, fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5, marginBottom: 12 },
  sub:             { color: T.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  beneficios:      { backgroundColor: T.white, borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 0.5, borderColor: T.border, gap: 10 },
  beneficio:       { color: T.text, fontSize: 13, fontWeight: '500' },
  btnPrincipal:    { backgroundColor: T.accent, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnPrincipalText:{ color: '#fff', fontSize: 16, fontWeight: '800' },
  btnSecundario:   { backgroundColor: T.white, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: T.border },
  btnSecundarioText: { color: T.muted, fontSize: 14, fontWeight: '600' },
  footer:          { textAlign: 'center', color: T.muted, fontSize: 11, marginTop: 24 },
})