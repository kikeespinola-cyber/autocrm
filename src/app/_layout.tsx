import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { T } from '../lib/theme'

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
        options={{ href: null }}
      />
      <Tabs.Screen
        name="cliente/editar/[id]"
        options={{ href: null }}
      />
    </Tabs>
  )
}