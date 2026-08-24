import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME, APP_FOOTER } from '../lib/marca'
import { mensajeError } from '../lib/errores'

const NEGRO = '#1A1A2E'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass]   = useState(false)
  const [loading, setLoading]   = useState(false)

  // Formulario inline de "¿Olvidaste tu contraseña?"
  const [modoRecuperar, setModoRecuperar]   = useState(false)
  const [emailRecuperar, setEmailRecuperar] = useState('')
  const [enviando, setEnviando]             = useState(false)
  const [linkEnviado, setLinkEnviado]       = useState(false)

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

  function abrirRecuperar() {
    setEmailRecuperar(email.trim())
    setLinkEnviado(false)
    setModoRecuperar(true)
  }

  function volverAlLogin() {
    setModoRecuperar(false)
    setLinkEnviado(false)
  }

  async function enviarLinkRecuperacion() {
    const destino = emailRecuperar.trim()
    if (!destino) {
      Alert.alert('Falta el email', 'Ingresá el email con el que te registraste')
      return
    }

    setEnviando(true)
    try {
      // El link del mail vuelve a la app por el scheme de app.json (vendix://).
      const { error } = await supabase.auth.resetPasswordForEmail(destino, {
        redirectTo: Linking.createURL('restablecer-password'),
      })
      if (error) throw error
      // Supabase no revela si el email existe, así que el mensaje es siempre el mismo.
      setLinkEnviado(true)
    } catch (e) {
      Alert.alert('No pudimos enviar el link', mensajeError(e))
    } finally {
      setEnviando(false)
    }
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

        {modoRecuperar ? (
          <View style={styles.form}>
            {linkEnviado ? (
              <>
                <View style={styles.iconoOk}>
                  <Ionicons name="mail-open-outline" size={22} color={T.accentText} />
                </View>
                <Text style={styles.formTitulo}>Revisá tu email</Text>
                <Text style={styles.formSub}>
                  Si <Text style={styles.emailDestacado}>{emailRecuperar.trim()}</Text> tiene una cuenta,
                  te mandamos un link para crear una contraseña nueva. Abrilo desde este mismo teléfono.
                </Text>

                <TouchableOpacity style={styles.btnLogin} onPress={volverAlLogin} activeOpacity={0.85}>
                  <Text style={styles.btnLoginText}>Volver</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.formTitulo}>Recuperar contraseña</Text>
                <Text style={styles.formSub}>Te mandamos un link para crear una nueva</Text>

                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={T.muted} />
                  <TextInput
                    style={styles.input}
                    placeholder="tu@email.com"
                    placeholderTextColor={T.muted}
                    value={emailRecuperar}
                    onChangeText={setEmailRecuperar}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btnLogin, enviando && { opacity: 0.6 }]}
                  onPress={enviarLinkRecuperacion}
                  disabled={enviando}
                  activeOpacity={0.85}
                >
                  {enviando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnLoginText}>Enviarme el link</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={volverAlLogin} style={styles.olvide} activeOpacity={0.7}>
                  <Text style={styles.olvideText}>Volver a iniciar sesión</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <>
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

              <TouchableOpacity onPress={abrirRecuperar} style={styles.olvide} activeOpacity={0.7}>
                <Text style={styles.olvideText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push('/registro')} style={styles.linkWrap}>
              <Text style={styles.link}>
                ¿No tenés cuenta? <Text style={styles.linkBold}>Registrate acá</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

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
  formSub:      { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 20, lineHeight: 19 },

  iconoOk:      { marginBottom: 10 },
  emailDestacado: { color: NEGRO, fontWeight: '700' },

  olvide:       { paddingVertical: 12, alignItems: 'center' },
  olvideText:   { color: T.accentText, fontSize: 13.5, fontWeight: '700' },

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
