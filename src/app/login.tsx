import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME, APP_FOOTER } from '../lib/marca'

const NEGRO = '#1A1A2E'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass]   = useState(false)
  const [loading, setLoading]   = useState(false)

  async function iniciarSesion() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Faltan datos', 'Ingresá tu email y contraseña')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      Alert.alert('No pudimos ingresar', 'Email o contraseña incorrectos')
    } else {
      router.replace('/')
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoLetter}>V</Text>
            <View style={styles.ruta1} />
            <View style={styles.ruta2} />
          </View>
          <Text style={styles.logoText}>{APP_NAME}</Text>
          <Text style={styles.eslogan}>Tus leads, más personales que nunca.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitulo}>Ingresá a tu cuenta</Text>
          <Text style={styles.formSub}>Bienvenido de vuelta</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={T.muted} />
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor={T.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={T.muted} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={T.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!verPass}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setVerPass(!verPass)} style={styles.eyeBtn}>
              <Ionicons name={verPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnLogin, loading && { opacity: 0.6 }]}
            onPress={iniciarSesion}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnLoginText}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/registro')} style={styles.linkWrap}>
          <Text style={styles.link}>
            ¿No tenés cuenta? <Text style={styles.linkBold}>Registrate acá</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>{APP_FOOTER}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: T.bg },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: 26 },

  logoArea:     { alignItems: 'center', marginBottom: 32 },
  logoIcon:     { width: 72, height: 72, borderRadius: 20, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoLetter:   { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 4 },
  ruta1:        { position: 'absolute', bottom: 14, left: 10, right: 10, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  ruta2:        { position: 'absolute', bottom: 8, left: 16, right: 16, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  logoText:     { fontSize: 32, fontWeight: '800', color: NEGRO, letterSpacing: -0.8 },
  eslogan:      { fontSize: 13, color: T.muted, marginTop: 5, fontWeight: '500' },

  form:         { backgroundColor: T.white, borderRadius: 20, padding: 22, borderWidth: 0.5, borderColor: T.border, marginBottom: 18 },
  formTitulo:   { color: NEGRO, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  formSub:      { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 20 },

  inputWrap:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.bg, borderRadius: 13, paddingHorizontal: 15, borderWidth: 0.5, borderColor: T.border, marginBottom: 11 },
  input:        { flex: 1, paddingVertical: 15, color: NEGRO, fontSize: 15 },
  eyeBtn:       { padding: 4 },

  btnLogin:     { backgroundColor: NEGRO, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnLoginText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  linkWrap:     { paddingVertical: 6 },
  link:         { textAlign: 'center', color: T.muted, fontSize: 13.5 },
  linkBold:     { color: NEGRO, fontWeight: '800' },

  footer:       { textAlign: 'center', color: T.muted, fontSize: 12, marginTop: 20, fontWeight: '500' },
})
