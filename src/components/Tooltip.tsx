import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native'
import { T } from '../lib/theme'

interface TooltipProps {
  visible: boolean
  titulo: string
  descripcion: string
  onCerrar: () => void
}

export default function Tooltip({ visible, titulo, descripcion, onCerrar }: TooltipProps) {
  if (!visible) return null

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Text style={{ fontSize: 24 }}>✦</Text>
          </View>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.descripcion}>{descripcion}</Text>
          <TouchableOpacity style={styles.btn} onPress={onCerrar}>
            <Text style={styles.btnText}>Entendido 👍</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', padding: 28, justifyContent: 'center' },
  card:        { backgroundColor: T.white, borderRadius: 20, padding: 24, alignItems: 'center' },
  iconBox:     { width: 56, height: 56, borderRadius: 28, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  titulo:      { color: T.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  descripcion: { color: T.textSub, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  btn:         { backgroundColor: T.accent, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '800' },
})