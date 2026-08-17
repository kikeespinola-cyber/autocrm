import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const NEGRO = '#1A1A2E'
const { width } = Dimensions.get('window')

type ToastTipo = 'success' | 'error' | 'info'

interface ToastConfig {
  mensaje: string
  tipo?: ToastTipo
}

interface ToastContextType {
  mostrarToast: (mensaje: string, tipo?: ToastTipo) => void
}

const ToastContext = createContext<ToastContextType>({ mostrarToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const CONFIG: Record<ToastTipo, { icon: any; color: string }> = {
  success: { icon: 'checkmark-circle', color: '#10B981' },
  error:   { icon: 'alert-circle',     color: '#EF4444' },
  info:    { icon: 'information-circle', color: '#04dedf' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ToastConfig | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(60)).current
  const timer = useRef<any>(null)

  const mostrarToast = useCallback((mensaje: string, tipo: ToastTipo = 'success') => {
    if (timer.current) clearTimeout(timer.current)
    setConfig({ mensaje, tipo })

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start()

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 60, duration: 220, useNativeDriver: true }),
      ]).start(() => setConfig(null))
    }, 2200)
  }, [])

  const info = config ? CONFIG[config.tipo || 'success'] : CONFIG.success

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      {config && (
        <Animated.View
          pointerEvents="none"
          style={[styles.container, { opacity, transform: [{ translateY }] }]}
        >
          <View style={styles.toast}>
            <Ionicons name={info.icon} size={18} color={info.color} />
            <Text style={styles.texto}>{config.mensaje}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NEGRO,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    maxWidth: width - 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  texto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
})
