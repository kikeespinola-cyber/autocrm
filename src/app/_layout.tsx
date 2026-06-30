import { Tabs } from 'expo-router'
import { Text, View } from 'react-native'
import { T } from '../lib/theme'

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: T.white,
          borderBottomWidth: 0.5,
          borderBottomColor: T.border,
        },
        headerShadowVisible: false,
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>V</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: T.text, letterSpacing: -0.3 }}>Vendix</Text>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: T.navBg,
          borderTopColor: T.navBorder,
          borderTopWidth: 0.5,
          height: 60,
        },
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Hoy', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚡</Text> }}
      />
      <Tabs.Screen
        name="clientes"
        options={{ title: 'Clientes', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👥</Text> }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{ title: 'Pipeline', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>◈</Text> }}
      />
      <Tabs.Screen
        name="postventa"
        options={{ title: 'Post-venta', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🤝</Text> }}
      />
      <Tabs.Screen
        name="metricas"
        options={{ title: 'Métricas', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text> }}
      />
      <Tabs.Screen
        name="cliente/[id]"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="cliente/editar/[id]"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  )
}