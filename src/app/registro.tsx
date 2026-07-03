import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

export default function RegistroScreen() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading]   = useState(false)

  async function registrarse() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Completá todos los campos')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      router.replace('/')
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoLetter}>V</Text>
          <View style={styles.ruta1} />
          <View style={styles.ruta2} />
        </View>
        <Text style={styles.logoText}>Vendix</Text>
        <Text style={styles.eslogan}>Empezá gratis por 14 días.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="tu@email.com"
          placeholderTextColor={T.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={T.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.inputLabel}>Confirmá la contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Repetí la contraseña"
          placeholderTextColor={T.muted}
          value={confirmar}
          onChangeText={setConfirmar}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btnRegistro} onPress={registrarse} disabled={loading}>
          <Text style={styles.btnRegistroText}>{loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.replace('/login')}>
        <Text style={styles.loginLink}>¿Ya tenés cuenta? <Text style={{ color: T.accent, fontWeight: '700' }}>Ingresá acá</Text></Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Vendix · Vendé con inteligencia.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: T.bg, justifyContent: 'center', padding: 28 },
  logoArea:     { alignItems: 'center', marginBottom: 36 },
  logoIcon:     { width: 72, height: 72, borderRadius: 18, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoLetter:   { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 4 },
  ruta1:        { position: 'absolute', bottom: 14, left: 10, right: 10, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  ruta2:        { position: 'absolute', bottom: 8, left: 16, right: 16, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  logoText:     { fontSize: 32, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  eslogan:      { fontSize: 13, color: T.muted, marginTop: 6, fontWeight: '500' },
  form:         { backgroundColor: T.white, borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: T.border, marginBottom: 16 },
  inputLabel:   { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input:        { backgroundColor: T.bg, borderRadius: 10, padding: 14, color: T.text, fontSize: 15, borderWidth: 0.5, borderColor: T.border },
  btnRegistro:  { backgroundColor: T.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  btnRegistroText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  loginLink:    { textAlign: 'center', color: T.muted, fontSize: 13, marginBottom: 16 },
  footer:       { textAlign: 'center', color: T.muted, fontSize: 12, marginTop: 8, fontWeight: '500' },
})