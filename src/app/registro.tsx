import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME, APP_FOOTER, URL_PRIVACIDAD, URL_TERMINOS } from '../lib/marca'

const NEGRO = '#1A1A2E'

const BENEFICIOS = [
  { icon: 'flash',           texto: '14 días gratis, sin tarjeta' },
  { icon: 'sparkles',        texto: 'Sugerencias con IA' },
  { icon: 'trending-up',     texto: 'Pipeline automático' },
]

export default function RegistroScreen() {
  const router = useRouter()
  const [nombre, setNombre]       = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPass, setVerPass]     = useState(false)
  const [loading, setLoading]     = useState(false)

  async function registrarse() {
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Faltan datos', 'Completá todos los campos')
      return
    }
    if (password.length < 8) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmar) {
      Alert.alert('No coinciden', 'Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    // El nombre viaja en options.data y queda en auth.users.raw_user_meta_data.
    // De ahí lo levanta el onboarding para escribirlo en
    // subscriptions.nombre_vendedor, que es lo que leen perfil, el PDF y los
    // emails de vencimiento. Es el unico momento en que se puede capturar: la
    // metadata de auth solo se escribe en el alta.
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nombre: nombre.trim() } },
    })
    if (error) {
      Alert.alert('No pudimos crear la cuenta', error.message)
    } else {
      router.replace('/')
    }
    setLoading(false)
  }

  const passOk    = password.length >= 8
  const matchOk   = confirmar.length > 0 && password === confirmar

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
          <Text style={styles.eslogan}>Empezá gratis por 14 días</Text>
        </View>

        <View style={styles.beneficios}>
          {BENEFICIOS.map(b => (
            <View key={b.texto} style={styles.beneficioItem}>
              <View style={styles.beneficioIcon}>
                <Ionicons name={b.icon as any} size={13} color={T.accentText} />
              </View>
              <Text style={styles.beneficioText}>{b.texto}</Text>
            </View>
          ))}
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitulo}>Creá tu cuenta</Text>
          <Text style={styles.formSub}>Empezá a vender con inteligencia</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={T.muted} />
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor={T.muted}
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

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
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={T.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!verPass}
              autoCapitalize="none"
            />
            {password.length > 0 && (
              <Ionicons
                name={passOk ? 'checkmark-circle' : 'alert-circle-outline'}
                size={17}
                color={passOk ? T.green : T.muted}
              />
            )}
            <TouchableOpacity onPress={() => setVerPass(!verPass)} style={styles.eyeBtn}>
              <Ionicons name={verPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={T.muted} />
            <TextInput
              style={styles.input}
              placeholder="Repetí la contraseña"
              placeholderTextColor={T.muted}
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry={!verPass}
              autoCapitalize="none"
            />
            {confirmar.length > 0 && (
              <Ionicons
                name={matchOk ? 'checkmark-circle' : 'close-circle'}
                size={17}
                color={matchOk ? T.green : T.red}
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.btnRegistro, loading && { opacity: 0.6 }]}
            onPress={registrarse}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnRegistroText}>Crear cuenta gratis</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          Al crear tu cuenta aceptás los{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(URL_TERMINOS)}>
            Términos y Condiciones
          </Text>{' '}
          y la{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(URL_PRIVACIDAD)}>
            Política de Privacidad
          </Text>.
        </Text>

        <TouchableOpacity onPress={() => router.replace('/login')} style={styles.linkWrap}>
          <Text style={styles.link}>
            ¿Ya tenés cuenta? <Text style={styles.linkBold}>Ingresá acá</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>{APP_FOOTER}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: T.bg },
  scroll:          { flexGrow: 1, justifyContent: 'center', padding: 26, paddingVertical: 40 },

  logoArea:        { alignItems: 'center', marginBottom: 22 },
  logoIcon:        { width: 68, height: 68, borderRadius: 19, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoLetter:      { color: '#fff', fontSize: 34, fontWeight: '900', marginBottom: 4 },
  ruta1:           { position: 'absolute', bottom: 13, left: 10, right: 10, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  ruta2:           { position: 'absolute', bottom: 7, left: 15, right: 15, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  logoText:        { fontSize: 30, fontWeight: '800', color: NEGRO, letterSpacing: -0.8 },
  eslogan:         { fontSize: 13, color: T.muted, marginTop: 5, fontWeight: '500' },

  beneficios:      { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  beneficioItem:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.accentDim, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  beneficioIcon:   { alignItems: 'center', justifyContent: 'center' },
  beneficioText:   { color: T.accentText, fontSize: 11, fontWeight: '600' },

  form:            { backgroundColor: T.white, borderRadius: 20, padding: 22, borderWidth: 0.5, borderColor: T.border, marginBottom: 18 },
  formTitulo:      { color: NEGRO, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  formSub:         { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 20 },

  inputWrap:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.bg, borderRadius: 13, paddingHorizontal: 15, borderWidth: 0.5, borderColor: T.border, marginBottom: 11 },
  input:           { flex: 1, paddingVertical: 15, color: NEGRO, fontSize: 15 },
  eyeBtn:          { padding: 4 },

  btnRegistro:     { backgroundColor: NEGRO, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnRegistroText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  linkWrap:        { paddingVertical: 6 },
  link:            { textAlign: 'center', color: T.muted, fontSize: 13.5 },
  linkBold:        { color: NEGRO, fontWeight: '800' },

  legal:           { textAlign: 'center', color: T.muted, fontSize: 11.5, lineHeight: 17, marginTop: 16, paddingHorizontal: 10 },
  legalLink:       { color: T.accentText, fontWeight: '700' },
  footer:          { textAlign: 'center', color: T.muted, fontSize: 12, marginTop: 20, fontWeight: '500' },
})
