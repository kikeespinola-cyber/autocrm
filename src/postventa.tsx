import { View, Text, StyleSheet } from 'react-native'

export default function PostVentaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Post-venta</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#EEEEF5', fontSize: 24, fontWeight: 'bold' },
})