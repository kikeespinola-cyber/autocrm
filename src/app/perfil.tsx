import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientesService'
import { Client } from '../lib/types'
import { T } from '../lib/theme'
import { generarReportePDF } from '../lib/reportePDF'

const MARCAS = [
  'Toyota', 'Volkswagen', 'Chevrolet', 'Ford', 'Hyundai',
  'Kia', 'Nissan', 'Honda', 'Jetour', 'Chery',
  'JAC', 'MG', 'BYD', 'Mitsubishi', 'Suzuki', 'Otra',
]

const MARCA_COLORES: Record<string, string> = {
  'Toyota':     '#EB0A1E',
  'Volkswagen': '#001E50',
  'Chevrolet':  '#D4AF37',
  'Ford':       '#003478',
  'Hyundai':    '#002C5F',
  'Kia':        '#BB162B',
  'Nissan':     '#C3002F',
  'Honda':      '#CC0000',
  'Jetour':     '#1A6BB5',
  'Chery':      '#E4002B',
  'JAC':        '#003087',
  'MG':         '#C41230',
  'BYD':        '#1DB954',
  'Mitsubishi': '#E60012',
  'Suzuki':     '#003087',
  'Otra':       '#9CA3AF',
}

const MARCA_LOGOS: Record<string, string> = {
  'Toyota':     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_carlogo.svg/120px-Toyota_carlogo.svg.png',
  'Volkswagen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/120px-Volkswagen_logo_2019.svg.png',
  'Chevrolet':  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Chevrolet_logo.svg/120px-Chevrolet_logo.svg.png',
  'Ford':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_Motor_Company_Logo.svg/120px-Ford_Motor_Company_Logo.svg.png',
  'Hyundai':    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Hyundai_Motor_Company_logo.svg/120px-Hyundai_Motor_Company_logo.svg.png',
  'Kia':        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kia-logo.svg/120px-Kia-logo.svg.png',
  'Nissan':     'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Nissan_2020_logo.svg/120px-Nissan_2020_logo.svg.png',
  'Honda':      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda.svg/120px-Honda.svg.png',
  'Mitsubishi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Mitsubishi_logo.svg/120px-Mitsubishi_logo.svg.png',
  'Suzuki':     'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/120px-Suzuki_logo_2.svg.png',
  'BYD':        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/BYD_Auto_logo.svg/120px-BYD_Auto_logo.svg.png',
}

export default function PerfilScreen() {
  const router = useRouter()
  const [user, setUser]                     = useState<any>(null)
  const [clients, setClients]               = useState<Client[]>([])
  const [modalPerfil, setModalPerfil]       = useState(false)
  const [nombreVendedor, setNombreVendedor] = useState('')
  const [concesionaria, setConcesionaria]   = useState('')
  const [marcaVehiculo, setMarcaVehiculo]   = useState('')
  const [avatarUrl, setAvatarUrl]           = useState<string | null>(null)
  const [guardando, setGuardando]           = useState(false)
  const [subiendoFoto, setSubiendoFoto]     = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    const data = await getClients()
    setClients(data)

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('nombre_vendedor, concesionaria, marca_vehiculo, avatar_url')
      .eq('user_id', user?.id)
      .single()

    if (sub) {
      setNombreVendedor(sub.nombre_vendedor || '')
      setConcesionaria(sub.concesionaria || '')
      setMarcaVehiculo(sub.marca_vehiculo || '')
      setAvatarUrl(sub.avatar_url || null)
    }
  }

  async function subirFoto() {
    if (typeof window === 'undefined') return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      setSubiendoFoto(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const ext = file.name.split('.').pop()
        const path = `${user?.id}/avatar.${ext}`
        const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        await supabase.from('subscriptions').update({ avatar_url: publicUrl }).eq('user_id', user?.id)
        setAvatarUrl(publicUrl + '?t=' + Date.now())
      } catch (e) {
        console.error(e)
      } finally {
        setSubiendoFoto(false)
      }
    }
    input.click()
  }

  async function guardarPerfil() {
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('subscriptions').update({
      nombre_vendedor: nombreVendedor.trim() || null,
      concesionaria: concesionaria.trim() || null,
      marca_vehiculo: marcaVehiculo || null,
    }).eq('user_id', user?.id)
    setGuardando(false)
    setModalPerfil(false)
    await cargar()
  }

  async function cerrarSesion() {
    const confirmar = typeof window !== 'undefined' ? window.confirm('¿Cerrar sesión?') : false
    if (!confirmar) return
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function exportarResumen() {
    const nombre = nombreVendedor || user?.email?.split('@')[0] || 'Vendedor'
    await generarReportePDF(clients, nombre, user?.email || '')
  }

  const vendidos     = clients.filter(c => c.sold)
  const activos      = clients.filter(c => !c.sold)
  const tasa         = clients.length > 0 ? Math.round((vendidos.length / clients.length) * 100) : 0
  const tiempos      = vendidos.filter(c => c.sale_date && c.created_at).map(c =>
    Math.floor((new Date(c.sale_date!).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
  )
  const promedioDias = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0
  const nombre       = nombreVendedor || user?.email?.split('@')[0] || 'Vendedor'
  const hora         = new Date().getHours()
  const saludo       = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  const marcaColor   = marcaVehiculo ? (MARCA_COLORES[marcaVehiculo] || T.accent) : T.accent
  const marcaLogo    = marcaVehiculo ? MARCA_LOGOS[marcaVehiculo] : null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Card de perfil */}
      <View style={styles.perfilCard}>
        {/* Avatar con botón de editar */}
        <TouchableOpacity onPress={subirFoto} style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarGrande, { backgroundColor: marcaColor }]}>
              <Text style={styles.avatarLetra}>{nombre[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={{ fontSize: 10 }}>{subiendoFoto ? '⏳' : '📷'}</Text>
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.perfilInfo}>
          <Text style={styles.saludo}>{saludo},</Text>
          <Text style={styles.nombre}>{nombre} 👋</Text>
          {concesionaria ? (
            <Text style={styles.concesionariaText}>🏢 {concesionaria}</Text>
          ) : null}

          {/* Logo de marca pequeño */}
          {marcaLogo ? (
            <View style={styles.marcaLogoRow}>
              <Image
                source={{ uri: marcaLogo }}
                style={styles.marcaLogoSmall}
                resizeMode="contain"
              />
              <Text style={[styles.marcaNombre, { color: marcaColor }]}>{marcaVehiculo}</Text>
            </View>
          ) : marcaVehiculo ? (
            <View style={[styles.marcaBadge, { backgroundColor: marcaColor }]}>
              <Text style={styles.marcaBadgeText}>{marcaVehiculo}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity onPress={() => setModalPerfil(true)} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 18 }}>✏️</Text>
        </TouchableOpacity>
      </View>

      {/* Analytics */}
      <Text style={styles.sectionLabel}>TUS MÉTRICAS</Text>
      <View style={styles.statsGrid}>
        {[
          { num: clients.length,  label: 'Total clientes',  color: T.text },
          { num: vendidos.length, label: 'Ventas cerradas', color: T.green },
          { num: `${tasa}%`,      label: 'Tasa de cierre',  color: T.accent },
          { num: activos.length,  label: 'Activos ahora',   color: T.warm },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.promedioCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.promedioNum}>{promedioDias > 0 ? `${promedioDias} días` : '—'}</Text>
          <Text style={styles.promedioLabel}>Tiempo promedio para cerrar una venta</Text>
          <Text style={styles.promedioSub}>Basado en {vendidos.length} venta{vendidos.length !== 1 ? 's' : ''} cerrada{vendidos.length !== 1 ? 's' : ''}</Text>
        </View>
        <Text style={{ fontSize: 32 }}>⏱</Text>
      </View>

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

      <Text style={styles.sectionLabel}>HERRAMIENTAS</Text>

      <TouchableOpacity style={styles.exportBtn} onPress={exportarResumen}>
        <Text style={styles.exportIcon}>📄</Text>
        <View>
          <Text style={styles.exportTitle}>Exportar reporte PDF</Text>
          <Text style={styles.exportSub}>Cierre de mes listo para compartir</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.exportBtn, { borderColor: '#1877F244' }]} onPress={() => router.push('/anuncios')}>
        <Text style={styles.exportIcon}>📢</Text>
        <View>
          <Text style={styles.exportTitle}>Generador de anuncios</Text>
          <Text style={styles.exportSub}>Creá el texto para tu pauta en redes con IA</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.exportBtn, { borderColor: T.purple + '44' }]} onPress={() => router.push('/admin')}>
        <Text style={styles.exportIcon}>👑</Text>
        <View>
          <Text style={styles.exportTitle}>Panel de administrador</Text>
          <Text style={styles.exportSub}>Gestionar usuarios y suscripciones</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={cerrarSesion}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Vendix · Vendé con inteligencia.</Text>

      <Modal visible={modalPerfil} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitulo}>Tu perfil</Text>

              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Carlos Mendoza"
                placeholderTextColor={T.muted}
                value={nombreVendedor}
                onChangeText={setNombreVendedor}
              />

              <Text style={styles.inputLabel}>Concesionaria</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Auto Americana"
                placeholderTextColor={T.muted}
                value={concesionaria}
                onChangeText={setConcesionaria}
              />

              <Text style={styles.inputLabel}>Marca que vendés</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {MARCAS.map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMarcaVehiculo(marcaVehiculo === m ? '' : m)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: marcaVehiculo === m ? (MARCA_COLORES[m] || T.accent) : T.bg,
                      borderWidth: 1, borderColor: (MARCA_COLORES[m] || T.accent) + '80',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: marcaVehiculo === m ? '#fff' : (MARCA_COLORES[m] || T.accent) }}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {marcaVehiculo && MARCA_LOGOS[marcaVehiculo] ? (
                <View style={{ alignItems: 'center', marginTop: 16, padding: 14, backgroundColor: T.bg, borderRadius: 12 }}>
                  <Image
                    source={{ uri: MARCA_LOGOS[marcaVehiculo] }}
                    style={{ width: 50, height: 50, resizeMode: 'contain' }}
                  />
                  <Text style={{ color: T.muted, fontSize: 11, marginTop: 6 }}>Logo de {marcaVehiculo}</Text>
                </View>
              ) : null}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalPerfil(false)}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGuardar} onPress={guardarPerfil} disabled={guardando}>
                  <Text style={styles.btnGuardarText}>{guardando ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: T.bg },
  content:           { padding: 20, paddingTop: 20, paddingBottom: 60 },
  perfilCard:        { backgroundColor: T.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 24, borderWidth: 0.5, borderColor: T.border },
  avatarContainer:   { position: 'relative' },
  avatarImg:         { width: 64, height: 64, borderRadius: 32 },
  avatarGrande:      { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarLetra:       { color: '#fff', fontSize: 26, fontWeight: '800' },
  avatarEditBadge:   { position: 'absolute', bottom: 0, right: 0, backgroundColor: T.white, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: T.border },
  perfilInfo:        { flex: 1 },
  saludo:            { color: T.muted, fontSize: 12, fontWeight: '500' },
  nombre:            { color: T.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 },
  concesionariaText: { color: T.muted, fontSize: 11, marginTop: 4 },
  marcaLogoRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  marcaLogoSmall:    { width: 24, height: 24 },
  marcaNombre:       { fontSize: 11, fontWeight: '700' },
  marcaBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 6, alignSelf: 'flex-start' },
  marcaBadgeText:    { color: '#fff', fontSize: 10, fontWeight: '800' },
  email:             { color: T.muted, fontSize: 11, marginTop: 2 },
  sectionLabel:      { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  statsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard:          { width: '48%', backgroundColor: T.white, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: T.border },
  statNum:           { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  statLabel:         { color: T.muted, fontSize: 11, marginTop: 3, fontWeight: '500' },
  promedioCard:      { backgroundColor: T.accentDim, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, borderWidth: 0.5, borderColor: T.accent + '44' },
  promedioNum:       { fontSize: 28, fontWeight: '800', color: T.accentText, letterSpacing: -0.5 },
  promedioLabel:     { color: T.accentText, fontSize: 13, fontWeight: '600', marginTop: 2 },
  promedioSub:       { color: T.accentDark, fontSize: 11, marginTop: 3 },
  pipelineCard:      { backgroundColor: T.white, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 0.5, borderColor: T.border },
  pipeRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: T.border },
  pipeLabel:         { color: T.text, fontSize: 13, fontWeight: '600' },
  pipeRight:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pipeBar:           { height: 6, borderRadius: 3 },
  pipeNum:           { fontSize: 14, fontWeight: '800', minWidth: 20, textAlign: 'right' },
  exportBtn:         { backgroundColor: T.white, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, borderWidth: 0.5, borderColor: T.border },
  exportIcon:        { fontSize: 28 },
  exportTitle:       { color: T.text, fontSize: 14, fontWeight: '700' },
  exportSub:         { color: T.muted, fontSize: 12, marginTop: 2 },
  logoutBtn:         { backgroundColor: T.white, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 0.5, borderColor: T.red + '44' },
  logoutText:        { color: T.red, fontSize: 15, fontWeight: '700' },
  footer:            { textAlign: 'center', color: T.muted, fontSize: 11, marginTop: 24, fontWeight: '500' },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard:         { backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitulo:       { color: T.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  inputLabel:        { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input:             { backgroundColor: T.bg, borderRadius: 10, padding: 12, color: T.text, fontSize: 14, borderWidth: 0.5, borderColor: T.border },
  modalBtns:         { flexDirection: 'row', gap: 10, marginTop: 24 },
  btnCancelar:       { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText:   { color: T.muted, fontWeight: '700' },
  btnGuardar:        { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: T.accent },
  btnGuardarText:    { color: '#fff', fontWeight: '800' },
})