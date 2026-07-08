import { Tabs, useRouter, useSegments } from 'expo-router'
import { Text, View, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

export default function Layout() {
  const router = useRouter()
  const segments = useSegments()
  const [session, setSession] = useState<any>(undefined) // undefined = todavía no sabemos
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return
    const inLogin    = segments[0] === 'login'
    const inRegistro = segments[0] === 'registro'

    if (!session && !inLogin && !inRegistro) {
      router.replace('/login')
    }
    if (session && (inLogin || inRegistro)) {
      router.replace('/')
    }
  }, [session, loading])

  // Mientras cargamos, mostrar pantalla de splash
  if (loading || session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>V</Text>
        </View>
        <Text style={{ color: T.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>Vendix</Text>
        <ActivityIndicator color={T.accent} size="small" style={{ marginTop: 8 }} />
      </View>
    )
  }

  const inLogin        = segments[0] === 'login'
  const inOnboarding   = segments[0] === 'onboarding'
  const inRegistro     = segments[0] === 'registro'
  const inTrialVencido = segments[0] === 'trial-vencido'
  const ocultarTabs    = inLogin || inOnboarding || inRegistro || inTrialVencido

  return (
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
            <Text style={{ fontSize: 17, fontWeight: '800', color: T.text, letterSpacing: -0.3 }}>Vendix</Text>
          </View>
        ),
        tabBarStyle: ocultarTabs
          ? { display: 'none' }
          : { backgroundColor: T.navBg, borderTopColor: T.navBorder, borderTopWidth: 0.5, height: 60 },
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoy', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚡</Text> }} />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👥</Text> }} />
      <Tabs.Screen name="pipeline" options={{ title: 'Pipeline', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>◈</Text> }} />
      <Tabs.Screen name="reuniones" options={{ title: 'Agenda', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📅</Text> }} />
      <Tabs.Screen name="postventa" options={{ title: 'Post-venta', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🤝</Text> }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text> }} />
      <Tabs.Screen name="metricas" options={{ title: 'Métricas', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text> }} />
      <Tabs.Screen name="login" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="registro" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="onboarding" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="trial-vencido" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="cliente/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="cliente/editar/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="anuncios" options={{ href: null, headerShown: true }} />
      <Tabs.Screen name="pautas" options={{ href: null, headerShown: true }} />
      <Tabs.Screen name="admin" options={{ href: null, headerShown: true }} />
    </Tabs>
  )
}