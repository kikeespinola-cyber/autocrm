import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Pide permiso de notificaciones. Devuelve true si quedó habilitado.
export async function pedirPermisos(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('recordatorios', {
      name: 'Recordatorios Vendix',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#04dedf',
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  return finalStatus === 'granted'
}

// Devuelve si el permiso ya está concedido (sin pedirlo)
export async function permisoConcedido(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted'
}

// Programa el recordatorio diario a las 9:00. Cancela los anteriores para no duplicar.
export async function programarRecordatorioDiario() {
  await Notifications.cancelAllScheduledNotificationsAsync()

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tu día en Vendix',
      body: 'Revisá quién toca contactar hoy para no perder ninguna venta.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  })
}

// Cancela todos los recordatorios programados
export async function cancelarRecordatorios() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// Devuelve si hay algún recordatorio programado
export async function tieneRecordatorioActivo(): Promise<boolean> {
  const programadas = await Notifications.getAllScheduledNotificationsAsync()
  return programadas.length > 0
}
