import { Tabs, useRouter, useSegments } from 'expo-router'
import { Text, View, ActivityIndicator, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import * as Linking from 'expo-linking'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME } from '../lib/marca'
import { ToastProvider } from '../components/Toast'
import { parsearTokensRecovery, guardarTokensRecovery } from '../lib/deepLinkAuth'

const NEGRO = '#1A1A2E'

export default function Layout() {
  const router = useRouter()
  const segments = useSegments()
  const insets = useSafeAreaInsets()
  const [session, setSession] = useState<any>(null)
  const [listo, setListo] = useState(false)
  const [enRecuperacion, setEnRecuperacion] = useState(false)
  // useLinkingURL (y no el deprecado useURL) porque devuelve la URL ya en el primer
  // render: así marcamos enRecuperacion antes de que el guard pueda mandar a /login.
  const urlEntrante = Linking.useLinkingURL()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setListo(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Deep link del mail de recuperación: vendix://restablecer-password#access_token=...
  // Canjeamos los tokens acá porque el guard de abajo corre en este mismo layout y,
  // mientras no haya sesión, expulsaría al usuario a /login antes de que alcancemos.
  useEffect(() => {
    if (!urlEntrante) return
    const tokens = parsearTokensRecovery(urlEntrante)
    if (!tokens) return

    let cancelado = false
    setEnRecuperacion(true)
    // Los dejamos guardados antes de canjearlos: la pantalla los necesita si la
    // sesión se cae despues, para rehacerla sin volver a pedir un link.
    guardarTokensRecovery(tokens)

    supabase.auth
      .setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
      .then(({ error }) => {
        if (cancelado) return
        if (error) {
          setEnRecuperacion(false)
          router.replace('/login')
          Alert.alert('Link vencido', 'El link para restablecer tu contraseña venció o ya se usó. Pedí uno nuevo.')
        } else {
          router.replace('/restablecer-password')
        }
      })

    return () => { cancelado = true }
  }, [urlEntrante])

  // Soltamos el freno del guard recién cuando el router ya llegó a la pantalla:
  // de ahí en más la protege la lista blanca de abajo.
  useEffect(() => {
    if (enRecuperacion && segments[0] === 'restablecer-password') setEnRecuperacion(false)
  }, [segments[0], enRecuperacion])

  useEffect(() => {
    if (!listo) return
    // Mientras canjeamos el token del mail todavía no hay sesión: no tocar nada.
    if (enRecuperacion) return

    const inLogin       = segments[0] === 'login'
    const inRegistro    = segments[0] === 'registro'
    const inRestablecer = segments[0] === 'restablecer-password'

    if (!session && !inLogin && !inRegistro && !inRestablecer) {
      router.replace('/login')
    }
    if (session && (inLogin || inRegistro)) {
      router.replace('/')
    }
  }, [session, listo, enRecuperacion])

  if (!listo) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>V</Text>
        </View>
        <Text style={{ color: NEGRO, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>{APP_NAME}</Text>
        <ActivityIndicator color={T.accent} size="small" style={{ marginTop: 8 }} />
      </View>
    )
  }

  const inLogin        = segments[0] === 'login'
  const inOnboarding   = segments[0] === 'onboarding'
  const inRegistro     = segments[0] === 'registro'
  const inTrialVencido = segments[0] === 'trial-vencido'
  const inRestablecer  = segments[0] === 'restablecer-password'
  const ocultarTabs    = inLogin || inOnboarding || inRegistro || inTrialVencido || inRestablecer

  return (
    <ToastProvider>
    <Tabs
      screenOptions={{
        headerShown: !ocultarTabs,
        headerStyle: { backgroundColor: T.white, borderBottomWidth: 0.5, borderBottomColor: T.border },
        headerShadowVisible: false,
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>V</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: NEGRO, letterSpacing: -0.3 }}>{APP_NAME}</Text>
          </View>
        ),
        tabBarStyle: ocultarTabs
          ? { display: 'none' }
          : {
              backgroundColor: T.white,
              borderTopColor: T.border,
              borderTopWidth: 0.5,
              height: 62 + insets.bottom,
              paddingTop: 8,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            },
        tabBarActiveTintColor: NEGRO,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'flash' : 'flash-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          title: 'Pipeline',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'git-branch' : 'git-branch-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reuniones"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={23} color={color} />
          ),
        }}
      />

      <Tabs.Screen name="metricas" options={{ href: null, headerShown: true }} />
      <Tabs.Screen name="postventa" options={{ href: null, headerShown: true }} />
      <Tabs.Screen name="login" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="registro" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="restablecer-password" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="onboarding" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="trial-vencido" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="cliente/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="cliente/editar/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="anuncios" options={{ href: null, headerShown: true }} />
      <Tabs.Screen name="pautas" options={{ href: null, headerShown: true }} />
      <Tabs.Screen name="catalogo" options={{ href: null, headerShown: true }} />
      <Tabs.Screen name="admin" options={{ href: null, headerShown: true }} />
    </Tabs>
    </ToastProvider>
  )
}
