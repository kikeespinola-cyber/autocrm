import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#13131A',
          borderTopColor: '#252535',
        },
        tabBarActiveTintColor: '#F0A020',
        tabBarInactiveTintColor: '#55556A',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Hoy', tabBarIcon: () => <Text>⚡</Text> }}
      />
      <Tabs.Screen
        name="clientes"
        options={{ title: 'Clientes', tabBarIcon: () => <Text>👥</Text> }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{ title: 'Pipeline', tabBarIcon: () => <Text>◈</Text> }}
      />
      <Tabs.Screen
        name="postventa"
        options={{ title: 'Post-venta', tabBarIcon: () => <Text>🤝</Text> }}
      />
      <Tabs.Screen
        name="metricas"
        options={{ title: 'Métricas', tabBarIcon: () => <Text>📊</Text> }}
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