import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientesService'
import { Client } from '../lib/types'
import { T } from '../lib/theme'

export default function PerfilScreen() {
  const router = useRouter()
  const [user, setUser]       = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    const data = await getClients()
    setClients(data)
  }

  async function cerrarSesion() {
    const confirmar = typeof window !== 'undefined'
      ? window.confirm('¿Cerrar sesión?')
      : false
    if (!confirmar) return
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function exportarResumen() {
    const mes = new Date().toLocaleString('es-PY', { month: 'long', year: 'numeric' })
    const vendidos = clients.filter(c => c.sold)
    const activos  = clients.filter(c => !c.sold)
    const hot      = activos.filter(c => c.temperature === 'hot').length
    const warm     = activos.filter(c => c.temperature === 'warm').length
    const cold     = activos.filter(c => c.temperature === 'cold').length
    const tasa     = clients.length > 0 ? Math.round((vendidos.length / clients.length) * 100) : 0

    const tiempos = vendidos
      .filter(c => c.sale_date && c.created_at)
      .map(c => {
        const dias = Math.floor((new Date(c.sale_date!).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
        return dias
      })
    const promedio = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0

    const resumen = `RESUMEN DE VENTAS — ${mes.toUpperCase()}
Vendedor: ${user?.user_metadata?.nombre || user?.email}
========================================

PIPELINE
- Total de clientes: ${clients.length}
- Activos: ${activos.length} (Hot: ${hot} · Warm: ${warm} · Cold: ${cold})
- Cerrados: ${vendidos.length}
- Tasa de cierre: ${tasa}%

RENDIMIENTO
- Promedio de días para cerrar una venta: ${promedio} días
- Clientes con documentos: ${clients.filter(c => c.docs_received).length}

VENTAS CERRADAS
${vendidos.map(c => `• ${c.name} — ${c.vehicle_interest || 'Sin vehículo'} — ${c.sale_date || 'Sin fecha'}`).join('\n') || '• Sin ventas cerradas este período'}

========================================
Generado por Vendix · ${new Date().toLocaleDateString('es-PY')}`

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(resumen)
      if (typeof window !== 'undefined') window.alert('✅ Resumen copiado al portapapeles')
    }
  }

  const vendidos  = clients.filter(c => c.sold)
  const activos   = clients.filter(c => !c.sold)
  const tasa      = clients.length > 0 ? Math.round((vendidos.length / clients.length) * 100) : 0

  const tiempos = vendidos
    .filter(c => c.sale_date && c.created_at)
    .map(c => Math.floor((new Date(c.sale_date!).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)))
  const promedioDias = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0

  const nombre = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Vendedor'
  const hora   = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Saludo */}
      <View style={styles.saludoCard}>
        <View style={styles.avatarGrande}>
          <Text style={styles.avatarLetra}>{nombre[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.saludo}>{saludo},</Text>
          <Text style={styles.nombre}>{nombre} 👋</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      {/* Analytics */}
      <Text style={styles.sectionLabel}>TUS MÉTRICAS</Text>

      <View style={styles.statsGrid}>
        {[
          { num: clients.length, label: 'Total clientes',  color: T.text },
          { num: vendidos.length, label: 'Ventas cerradas', color: T.green },
          { num: `${tasa}%`,     label: 'Tasa de cierre',  color: T.accent },
          { num: activos.length, label: 'Activos ahora',   color: T.warm },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Tiempo promedio */}
      <View style={styles.promedioCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.promedioNum}>{promedioDias > 0 ? `${promedioDias} días` : '—'}</Text>
          <Text style={styles.promedioLabel}>Tiempo promedio para cerrar una venta</Text>
          <Text style={styles.promedioSub}>Basado en {vendidos.length} venta{vendidos.length !== 1 ? 's' : ''} cerrada{vendidos.length !== 1 ? 's' : ''}</Text>
        </View>
        <Text style={{ fontSize: 32 }}>⏱</Text>
      </View>

      {/* Pipeline breakdown */}
      <Text style={styles.sectionLabel}>PIPELINE ACTUAL</Text>
      <View style={styles.pipelineCard}>
        {[
          { label: '🔴 Hot',      num: activos.filter(c => c.temperature === 'hot').length,  color: T.red },
          { label: '🟡 Warm',     num: activos.filter(c => c.temperature === 'warm').length, color: T.warm },
          { label: '🔵 Cold',     num: activos.filter(c => c.temperature === 'cold').length, color: T.blue },
          { label: '✅ Cerrados', num: vendidos.length,                                       color: T.green },
        ].map((r, i, arr) => (
          <View key={r.label} style={[styles.pipeRow, i === arr.length-1 && { borderBottomWidth: 0 }]}>
            <Text style={styles.pipeLabel}>{r.label}</Text>
            <View style={styles.pipeRight}>
              <View style={[styles.pipeBar, { width: clients.length > 0 ? Math.max((r.num / clients.length) * 120, 4) : 4, backgroundColor: r.color }]} />
              <Text style={[styles.pipeNum, { color: r.color }]}>{r.num}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Exportar */}
      <Text style={styles.sectionLabel}>EXPORTAR</Text>
      <TouchableOpacity style={styles.exportBtn} onPress={exportarResumen}>
        <Text style={styles.exportIcon}>📋</Text>
        <View>
          <Text style={styles.exportTitle}>Copiar resumen del mes</Text>
          <Text style={styles.exportSub}>Listo para pegar en WhatsApp o email</Text>
        </View>
      </TouchableOpacity>
<TouchableOpacity style={[styles.exportBtn, { borderColor: T.purple + '44' }]} onPress={() => router.push('/admin')}>
        <Text style={styles.exportIcon}>👑</Text>
        <View>
          <Text style={styles.exportTitle}>Panel de administrador</Text>
          <Text style={styles.exportSub}>Gestionar usuarios y suscripciones</Text>
        </View>
      </TouchableOpacity>
      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.logoutBtn} onPress={cerrarSesion}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Vendix · El CRM del vendedor</Text>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: T.bg },
  content:        { padding: 20, paddingTop: 20, paddingBottom: 60 },
  saludoCard:     { backgroundColor: T.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24, borderWidth: 0.5, borderColor: T.border },
  avatarGrande:   { width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  avatarLetra:    { color: '#fff', fontSize: 24, fontWeight: '800' },
  saludo:         { color: T.muted, fontSize: 13, fontWeight: '500' },
  nombre:         { color: T.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  email:          { color: T.muted, fontSize: 11, marginTop: 2 },
  sectionLabel:   { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  statsGrid:      { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard:       { width: '48%', backgroundColor: T.white, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: T.border },
  statNum:        { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  statLabel:      { color: T.muted, fontSize: 11, marginTop: 3, fontWeight: '500' },
  promedioCard:   { backgroundColor: T.accentDim, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, borderWidth: 0.5, borderColor: T.accent + '44' },
  promedioNum:    { fontSize: 28, fontWeight: '800', color: T.accentText, letterSpacing: -0.5 },
  promedioLabel:  { color: T.accentText, fontSize: 13, fontWeight: '600', marginTop: 2 },
  promedioSub:    { color: T.accentDark, fontSize: 11, marginTop: 3 },
  pipelineCard:   { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 0.5, borderColor: T.border },
  pipeRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: T.border },
  pipeLabel:      { color: T.text, fontSize: 13, fontWeight: '600' },
  pipeRight:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pipeBar:        { height: 6, borderRadius: 3 },
  pipeNum:        { fontSize: 14, fontWeight: '800', minWidth: 20, textAlign: 'right' },
  exportBtn:      { backgroundColor: T.white, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, borderWidth: 0.5, borderColor: T.border },
  exportIcon:     { fontSize: 28 },
  exportTitle:    { color: T.text, fontSize: 14, fontWeight: '700' },
  exportSub:      { color: T.muted, fontSize: 12, marginTop: 2 },
  logoutBtn:      { backgroundColor: T.white, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 0.5, borderColor: T.red + '44' },
  logoutText:     { color: T.red, fontSize: 15, fontWeight: '700' },
  footer:         { textAlign: 'center', color: T.muted, fontSize: 11, marginTop: 24, fontWeight: '500' },
})