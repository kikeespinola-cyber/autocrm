import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function pedirPermisos(): Promise<boolean> {
  if (Platform.OS === 'web') return false

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  return finalStatus === 'granted'
}

export async function programarRecordatorioDiario() {
  if (Platform.OS === 'web') return

  await Notifications.cancelAllScheduledNotificationsAsync()

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚡ Tu día en Vendix',
      body: 'Revisá quién toca contactar hoy',
      sound: true,
    },
    trigger: {
      hour: 8,
      minute: 0,
      repeats: true,
    },
  })
}

export async function notificarClienteUrgente(nombreCliente: string, accion: string) {
  if (Platform.OS === 'web') return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔴 ${nombreCliente}`,
      body: accion,
      sound: true,
    },
    trigger: null,
  })
}