import { Tabs, useRouter, useSegments } from 'expo-router'
import { Text, View } from 'react-native'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

export default function Layout() {
  const router = useRouter()
  const segments = useSegments()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const onboardingVerificado = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      onboardingVerificado.current = false
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return
    const inLogin      = segments[0] === 'login'
    const inRegistro   = segments[0] === 'registro'
    const inOnboarding = segments[0] === 'onboarding'

    if (!session && !inLogin && !inRegistro) {
      router.replace('/login')
      return
    }

    if (session && !inLogin && !inRegistro && !inOnboarding && !onboardingVerificado.current) {
      onboardingVerificado.current = true
      verificarOnboarding()
    }

    if (session && (inLogin || inRegistro)) {
      router.replace('/')
    }
  }, [session, loading, segments])

  async function verificarOnboarding() {
    const { data } = await supabase
      .from('subscriptions')
      .select('onboarding_completado')
      .eq('user_id', session.user.id)
      .single()

    if (data && !data.onboarding_completado) {
      router.replace('/onboarding')
    }
  }

  if (loading) return null

  const inLogin      = segments[0] === 'login'
  const inOnboarding = segments[0] === 'onboarding'
  const inRegistro   = segments[0] === 'registro'
  const ocultarTabs  = inLogin || inOnboarding || inRegistro

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
      <Tabs.Screen name="postventa" options={{ title: 'Post-venta', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🤝</Text> }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text> }} />
      <Tabs.Screen name="metricas" options={{ title: 'Métricas', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text> }} />
      <Tabs.Screen name="login" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="registro" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="onboarding" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="cliente/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="cliente/editar/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="anuncios" options={{ href: null, headerShown: true }} />
      <Tabs.Screen name="admin" options={{ href: null, headerShown: true }} />
    </Tabs>
  )
}