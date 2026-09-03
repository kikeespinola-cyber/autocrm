import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_FOOTER } from '../lib/marca'

const NEGRO = '#1A1A2E'

// Pantalla informativa, sin ningún camino de compra ni de contacto para activar:
// Apple 3.1.1 cuenta cualquier CTA de activación como mecanismo de pago externo.
// La activación se gestiona por fuera de la app (panel de admin).

export default function TrialVencidoScreen() {
  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.iconBox}>
        <Ionicons name="time-outline" size={42} color={T.warm} />
      </View>

      <Text style={styles.titulo}>Tu período de prueba finalizó</Text>
      <Text style={styles.sub}>
        Tus datos están guardados y te esperan.
      </Text>

      <View style={styles.avisoBox}>
        <Ionicons name="shield-checkmark-outline" size={16} color={T.green} />
        <Text style={styles.avisoText}>
          Tu información sigue segura y completa, tal como la dejaste.
        </Text>
      </View>

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

  avisoBox:          { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: T.greenDim, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 0.5, borderColor: T.green + '33' },
  avisoText:         { color: T.greenText, fontSize: 12, lineHeight: 18, flex: 1 },

  btnSecundario:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: T.white, borderRadius: 15, paddingVertical: 16, borderWidth: 0.5, borderColor: T.border },
  btnSecundarioText: { color: T.muted, fontSize: 14, fontWeight: '600' },

  footer:            { textAlign: 'center', color: T.muted, fontSize: 11.5, marginTop: 24, fontWeight: '500' },
})
