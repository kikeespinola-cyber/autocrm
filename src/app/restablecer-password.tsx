import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME, APP_FOOTER } from '../lib/marca'
import { mensajeError } from '../lib/errores'

const NEGRO = '#1A1A2E'

// Si en este tiempo no apareció la sesión de recuperación, damos el link por vencido.
const ESPERA_MAXIMA_MS = 6000

type Estado = 'verificando' | 'listo' | 'invalido'

export default function RestablecerPasswordScreen() {
  const router = useRouter()
  const [estado, setEstado]       = useState<Estado>('verificando')
  const [password, setPassword]   = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPass, setVerPass]     = useState(false)
  const [guardando, setGuardando] = useState(false)

  // El canje del token del mail lo hace _layout.tsx (tiene que ganarle al guard de sesión).
  // Acá sólo esperamos a que la sesión de recuperación exista.
  useEffect(() => {
    let vivo = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (vivo && session) setEstado('listo')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (vivo && session) setEstado('listo')
    })

    const timeout = setTimeout(() => {
      if (vivo) setEstado(actual => (actual === 'verificando' ? 'invalido' : actual))
    }, ESPERA_MAXIMA_MS)

    return () => {
      vivo = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function guardarPassword() {
    if (!password.trim()) {
      Alert.alert('Faltan datos', 'Ingresá tu contraseña nueva')
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

    setGuardando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      Alert.alert('Listo', 'Tu contraseña quedó actualizada', [
        { text: 'Entrar', onPress: () => router.replace('/') },
      ])
    } catch (e) {
      Alert.alert('No pudimos actualizarla', mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  // Si abandona el flujo cerramos la sesión de recuperación: entró con un link,
  // no con su contraseña.
  async function cancelar() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const passOk  = password.length >= 8
  const matchOk = confirmar.length > 0 && password === confirmar

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
          <Text style={styles.eslogan}>Elegí tu contraseña nueva</Text>
        </View>

        {estado === 'verificando' && (
          <View style={[styles.form, styles.formCentrado]}>
            <ActivityIndicator color={T.accent} size="small" />
            <Text style={styles.esperando}>Validando el link...</Text>
          </View>
        )}

        {estado === 'invalido' && (
          <View style={styles.form}>
            <View style={styles.iconoAviso}>
              <Ionicons name="alert-circle-outline" size={22} color={T.red} />
            </View>
            <Text style={styles.formTitulo}>El link no sirve más</Text>
            <Text style={styles.formSub}>
              Venció o ya lo usaste. Pedí uno nuevo desde la pantalla de ingreso.
            </Text>
            <TouchableOpacity style={styles.btnPrincipal} onPress={cancelar} activeOpacity={0.85}>
              <Text style={styles.btnPrincipalText}>Volver a ingresar</Text>
            </TouchableOpacity>
          </View>
        )}

        {estado === 'listo' && (
          <View style={styles.form}>
            <Text style={styles.formTitulo}>Nueva contraseña</Text>
            <Text style={styles.formSub}>Vas a usarla para entrar de ahora en más</Text>

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
                autoFocus
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
              style={[styles.btnPrincipal, guardando && { opacity: 0.6 }]}
              onPress={guardarPassword}
              disabled={guardando}
              activeOpacity={0.85}
            >
              {guardando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrincipalText}>Guardar y entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={cancelar} style={styles.linkWrap} disabled={guardando}>
              <Text style={styles.link}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footer}>{APP_FOOTER}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: T.bg },
  scroll:           { flexGrow: 1, justifyContent: 'center', padding: 26 },

  logoArea:         { alignItems: 'center', marginBottom: 32 },
  logoIcon:         { width: 72, height: 72, borderRadius: 20, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoLetter:       { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 4 },
  ruta1:            { position: 'absolute', bottom: 14, left: 10, right: 10, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  ruta2:            { position: 'absolute', bottom: 8, left: 16, right: 16, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  logoText:         { fontSize: 32, fontWeight: '800', color: NEGRO, letterSpacing: -0.8 },
  eslogan:          { fontSize: 13, color: T.muted, marginTop: 5, fontWeight: '500' },

  form:             { backgroundColor: T.white, borderRadius: 20, padding: 22, borderWidth: 0.5, borderColor: T.border, marginBottom: 18 },
  formCentrado:     { alignItems: 'center', gap: 12, paddingVertical: 34 },
  formTitulo:       { color: NEGRO, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  formSub:          { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 20, lineHeight: 19 },
  esperando:        { color: T.muted, fontSize: 13.5, fontWeight: '500' },
  iconoAviso:       { marginBottom: 10 },

  inputWrap:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.bg, borderRadius: 13, paddingHorizontal: 15, borderWidth: 0.5, borderColor: T.border, marginBottom: 11 },
  input:            { flex: 1, paddingVertical: 15, color: NEGRO, fontSize: 15 },
  eyeBtn:           { padding: 4 },

  btnPrincipal:     { backgroundColor: NEGRO, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnPrincipalText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  linkWrap:         { paddingVertical: 12 },
  link:             { textAlign: 'center', color: T.muted, fontSize: 13.5, fontWeight: '600' },

  footer:           { textAlign: 'center', color: T.muted, fontSize: 12, marginTop: 20, fontWeight: '500' },
})
