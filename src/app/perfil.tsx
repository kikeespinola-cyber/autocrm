import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, Alert, Linking, Switch, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientesService'
import { Client } from '../lib/types'
import { T } from '../lib/theme'
import { APP_NAME, APP_FOOTER, URL_PRIVACIDAD, URL_TERMINOS } from '../lib/marca'
import { generarReportePDF } from '../lib/reportePDF'
import { exportarClientesCSV, exportarClientesPDF } from '../lib/exportar'
import { actualizarRacha, calcularInsignias } from '../lib/racha'
import { elegirImagen, subirImagen } from '../lib/imagenService'
import { pedirPermisos, programarRecordatorioDiario, cancelarRecordatorios, tieneRecordatorioActivo } from '../lib/notificaciones'

const NEGRO = '#1A1A2E'

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

const INSIGNIA_ICONS: Record<string, any> = {
  primera_venta:    'trophy',
  cinco_ventas:     'medal',
  diez_ventas:      'ribbon',
  racha_7:          'flame',
  racha_30:         'flash',
  diez_clientes:    'people',
  cincuenta_clientes: 'people-circle',
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
  const [notifActivas, setNotifActivas] = useState(false)
  const [isAdmin, setIsAdmin]               = useState(false)
  const [racha, setRacha]                   = useState(0)
  const [diasTrial, setDiasTrial]           = useState<number | null>(null)
  const [statusSub, setStatusSub]           = useState<string>('')
  const [metaMensual, setMetaMensual]       = useState(0)
  const [editandoMeta, setEditandoMeta]     = useState(false)
  const [metaInput, setMetaInput]           = useState('')
  const [guardando, setGuardando]           = useState(false)
  const [subiendoFoto, setSubiendoFoto]     = useState(false)
  const [modalExportar, setModalExportar]   = useState(false)

  useEffect(() => {
    cargar()
    tieneRecordatorioActivo().then(setNotifActivas)
  }, [])

  async function cargar() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const data = await getClients()
      setClients(data)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('nombre_vendedor, concesionaria, marca_vehiculo, avatar_url, is_admin, racha_dias, status, current_period_end, meta_mensual')
        .eq('user_id', user.id)
        .single()

      if (sub) {
        setNombreVendedor(sub.nombre_vendedor || '')
        setConcesionaria(sub.concesionaria || '')
        setMarcaVehiculo(sub.marca_vehiculo || '')
        setAvatarUrl(sub.avatar_url || null)
        setIsAdmin(sub.is_admin || false)
        setRacha(sub.racha_dias || 0)
        setStatusSub(sub.status || '')
        setMetaMensual(sub.meta_mensual || 0)
        if (sub.status === 'trial' && sub.current_period_end) {
          const dias = Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          setDiasTrial(dias)
        }
      }

      const rachaActual = await actualizarRacha(user.id)
      setRacha(rachaActual)
    } catch (e) {
      console.error('Error en perfil:', e)
    }
  }

  async function subirFoto() {
    const asset = await elegirImagen([1, 1])
    if (!asset) return
    setSubiendoFoto(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const url = await subirImagen(asset, 'avatars', `${user?.id}/avatar`)
      await supabase.from('subscriptions').update({ avatar_url: url }).eq('user_id', user?.id)
      setAvatarUrl(url)
    } catch (e) {
      console.error(e)
    } finally {
      setSubiendoFoto(false)
    }
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

  async function guardarMeta() {
    const meta = parseInt(metaInput) || 0
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('subscriptions').update({ meta_mensual: meta }).eq('user_id', user?.id)
    setMetaMensual(meta)
    setEditandoMeta(false)
  }

  async function toggleNotificaciones(valor: boolean) {
    if (valor) {
      const ok = await pedirPermisos()
      if (!ok) {
        Alert.alert(
          'Permiso necesario',
          `Para recibir recordatorios, activá las notificaciones de ${APP_NAME} en los ajustes de tu teléfono.`
        )
        return
      }
      await programarRecordatorioDiario()
      setNotifActivas(true)
    } else {
      await cancelarRecordatorios()
      setNotifActivas(false)
    }
  }

  function cerrarSesion() {
    Alert.alert(
      '¿Cerrar sesión?',
      'Vas a tener que ingresar de nuevo con tu email y contraseña.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut()
            router.replace('/login')
          },
        },
      ]
    )
  }

  async function exportarCartera(formato: 'pdf' | 'csv') {
    const nombreV = nombreVendedor || user?.email?.split('@')[0] || 'Vendedor'
    try {
      if (formato === 'pdf') await exportarClientesPDF(clients, nombreV)
      else await exportarClientesCSV(clients, nombreV)
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar. Intentá de nuevo.')
    }
  }

  async function exportarResumen() {
    const nombre = nombreVendedor || user?.email?.split('@')[0] || 'Vendedor'
    await generarReportePDF(clients, nombre, user?.email || '')
  }

  const vendidos     = clients.filter(c => c.sold)
  const activos      = clients.filter(c => !c.sold)
  const tasa         = clients.length > 0 ? Math.round((vendidos.length / clients.length) * 100) : 0
  const referidos    = clients.filter(c => c.origen === 'referido').length
  const refVendidos  = clients.filter(c => c.origen === 'referido' && c.sold).length
  const tiempos      = vendidos.filter(c => c.sale_date && c.created_at).map(c =>
    Math.floor((new Date(c.sale_date!).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
  )
  const promedioDias = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0
  const nombre       = nombreVendedor || user?.email?.split('@')[0] || 'Vendedor'
  const hora         = new Date().getHours()
  const saludo       = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  const marcaColor   = marcaVehiculo ? (MARCA_COLORES[marcaVehiculo] || T.accent) : T.accent
  const marcaLogo    = marcaVehiculo ? MARCA_LOGOS[marcaVehiculo] : null
  const insignias    = calcularInsignias(racha, vendidos.length, clients.length)
  const pctMeta      = metaMensual > 0 ? Math.min(Math.round((vendidos.length / metaMensual) * 100), 100) : 0

  const rachaIcon = racha >= 30 ? 'flash' : racha >= 7 ? 'flame' : racha >= 3 ? 'trending-up' : 'calendar-outline'
  const rachaColor = racha >= 7 ? '#F97316' : racha >= 3 ? T.accent : T.muted

  const HERRAMIENTAS = [
    { icon: 'stats-chart',      color: '#8B5CF6', titulo: 'Métricas',                sub: 'Tu rendimiento en detalle',                     onPress: () => router.push('/metricas') },
    { icon: 'checkmark-done',   color: '#10B981', titulo: 'Post-venta',              sub: 'Seguimiento de clientes que ya compraron',      onPress: () => router.push('/postventa') },
    { icon: 'car-sport',        color: '#04dedf', titulo: 'Mi catálogo',             sub: 'Tus vehículos a mano para generar anuncios',    onPress: () => router.push('/catalogo') },
    { icon: 'document-text',    color: '#64748B', titulo: 'Exportar reporte PDF',    sub: 'Cierre de mes listo para compartir',            onPress: exportarResumen },
    { icon: 'download',         color: '#DC2626', titulo: 'Descargar mis clientes',  sub: 'Respaldo de tu cartera en PDF o Excel',         onPress: () => setModalExportar(true) },
    { icon: 'bar-chart',        color: '#E1306C', titulo: 'Estadísticas de pautas',  sub: 'Medí el retorno de tu inversión en redes',      onPress: () => router.push('/pautas') },
    { icon: 'megaphone',        color: '#1877F2', titulo: 'Generador de anuncios',   sub: 'Creá el texto para tu pauta en redes con IA',   onPress: () => router.push('/anuncios') },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <View style={styles.perfilCard}>
        <TouchableOpacity onPress={subirFoto} style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarGrande, { backgroundColor: marcaColor }]}>
              <Text style={styles.avatarLetra}>{nombre[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name={subiendoFoto ? 'hourglass-outline' : 'camera'} size={11} color={NEGRO} />
          </View>
        </TouchableOpacity>

        <View style={styles.perfilInfo}>
          <Text style={styles.saludo}>{saludo},</Text>
          <Text style={styles.nombre}>{nombre}</Text>
          {concesionaria ? (
            <View style={styles.inlineRow}>
              <Ionicons name="business-outline" size={12} color={T.muted} />
              <Text style={styles.concesionariaText}>{concesionaria}</Text>
            </View>
          ) : null}
          {marcaLogo ? (
            <View style={styles.marcaLogoRow}>
              <Image source={{ uri: marcaLogo }} style={styles.marcaLogoSmall} resizeMode="contain" />
              <Text style={[styles.marcaNombre, { color: marcaColor }]}>{marcaVehiculo}</Text>
            </View>
          ) : marcaVehiculo ? (
            <View style={[styles.marcaBadge, { backgroundColor: marcaColor }]}>
              <Text style={styles.marcaBadgeText}>{marcaVehiculo}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity onPress={() => setModalPerfil(true)} style={styles.editIconBtn}>
          <Ionicons name="create-outline" size={19} color={T.textSub} />
        </TouchableOpacity>
      </View>

      {statusSub === 'trial' && diasTrial !== null && (
        <TouchableOpacity
          style={[styles.trialCard, { borderColor: diasTrial <= 3 ? T.red + '44' : T.warm + '44' }]}
          onPress={() => router.push('/planes')}
        >
          <View style={[styles.iconCircle, { backgroundColor: (diasTrial <= 3 ? T.red : T.warm) + '1A' }]}>
            <Ionicons
              name={diasTrial <= 3 ? 'alert-circle' : 'time-outline'}
              size={20}
              color={diasTrial <= 3 ? T.red : T.warm}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trialTitulo, { color: diasTrial <= 3 ? T.red : T.warm }]}>
              {diasTrial <= 0 ? 'Tu prueba venció' : `Te quedan ${diasTrial} día${diasTrial !== 1 ? 's' : ''} de prueba`}
            </Text>
            <Text style={styles.trialSub}>
              {diasTrial <= 3 ? 'Tocá para ver los planes y activar' : 'Prueba activa · Tocá para ver los planes'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={T.muted} />
        </TouchableOpacity>
      )}

      <View style={styles.rachaCard}>
        <View style={[styles.iconCircle, { backgroundColor: rachaColor + '1A' }]}>
          <Ionicons name={rachaIcon as any} size={22} color={rachaColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rachaNum}>{racha} día{racha !== 1 ? 's' : ''} consecutivos</Text>
          <Text style={styles.rachaSub}>
            {racha === 0 ? `Abrí ${APP_NAME} todos los días para mantener tu racha` :
             racha < 3  ? 'Buen comienzo — seguí así' :
             racha < 7  ? '¡Vas muy bien! Llegá a los 7 días' :
             racha < 30 ? 'En llamas — ¡no pares!' :
             'Imparable — 30+ días de racha'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>META DEL MES</Text>
      <View style={styles.metaCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <View>
            <Text style={styles.metaNum}>
              {vendidos.length}
              {metaMensual > 0 ? <Text style={{ fontSize: 18, color: T.muted, fontWeight: '400' }}> / {metaMensual}</Text> : null}
            </Text>
            <Text style={styles.metaLabel}>ventas cerradas este mes</Text>
          </View>
          <TouchableOpacity
            onPress={() => { setMetaInput(String(metaMensual || '')); setEditandoMeta(true) }}
            style={[styles.iconCircle, { backgroundColor: NEGRO }]}
          >
            <Ionicons name="flag" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        {metaMensual > 0 ? (
          <>
            <View style={styles.metaBarBg}>
              <View style={[styles.metaBarFill, {
                width: (pctMeta + '%') as any,
                backgroundColor: vendidos.length >= metaMensual ? T.green : NEGRO,
              }]} />
            </View>
            <View style={styles.inlineRow}>
              {vendidos.length >= metaMensual && <Ionicons name="trophy" size={13} color={T.green} />}
              <Text style={[styles.metaPct, { color: vendidos.length >= metaMensual ? T.green : T.textSub }]}>
                {vendidos.length >= metaMensual
                  ? '¡Meta alcanzada!'
                  : pctMeta + '% completado — te faltan ' + (metaMensual - vendidos.length) + ' venta' + (metaMensual - vendidos.length !== 1 ? 's' : '')}
              </Text>
            </View>
          </>
        ) : (
          <TouchableOpacity onPress={() => { setMetaInput(''); setEditandoMeta(true) }} style={styles.inlineRow}>
            <Ionicons name="add-circle-outline" size={16} color={NEGRO} />
            <Text style={{ color: NEGRO, fontSize: 13, fontWeight: '700' }}>Fijar meta del mes</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionLabel}>TUS INSIGNIAS</Text>
      <View style={styles.insigniasGrid}>
        {insignias.map(ins => (
          <View key={ins.id} style={[styles.insigniaCard, !ins.obtenida && { opacity: 0.3 }]}>
            <View style={[styles.insigniaIconWrap, ins.obtenida && { backgroundColor: '#FEF3C7' }]}>
              <Ionicons
                name={(INSIGNIA_ICONS[ins.id] || 'star') as any}
                size={20}
                color={ins.obtenida ? '#D97706' : T.muted}
              />
            </View>
            <Text style={styles.insigniaLabel}>{ins.label}</Text>
            <Text style={styles.insigniaDesc}>{ins.descripcion}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>TUS MÉTRICAS</Text>
      <View style={styles.statsGrid}>
        {[
          { num: clients.length,  label: 'Total clientes',  color: NEGRO,   icon: 'people-outline' },
          { num: vendidos.length, label: 'Ventas cerradas', color: T.green, icon: 'checkmark-circle-outline' },
          { num: tasa + '%',      label: 'Tasa de cierre',  color: T.accentText, icon: 'trending-up-outline' },
          { num: activos.length,  label: 'Activos ahora',   color: T.warm,  icon: 'pulse-outline' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={17} color={s.color} style={{ marginBottom: 6 }} />
            <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.promedioCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.promedioNum}>{promedioDias > 0 ? promedioDias + ' días' : '—'}</Text>
          <Text style={styles.promedioLabel}>Tiempo promedio para cerrar una venta</Text>
          <Text style={styles.promedioSub}>Basado en {vendidos.length} venta{vendidos.length !== 1 ? 's' : ''} cerrada{vendidos.length !== 1 ? 's' : ''}</Text>
        </View>
        <Ionicons name="timer-outline" size={30} color={T.accentText} />
      </View>

      <View style={styles.referidosCard}>
        <View style={styles.referidosIcon}>
          <Ionicons name="people" size={22} color="#8B5CF6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.referidosNum}>
            {referidos}
            <Text style={styles.referidosLabel}> {referidos === 1 ? 'referido' : 'referidos'}</Text>
          </Text>
          <Text style={styles.referidosSub}>
            {referidos === 0
              ? 'Pedí referidos a tus clientes satisfechos'
              : refVendidos > 0
              ? `${refVendidos} ya se convirtió en venta`
              : 'Seguí trabajándolos para cerrar'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>PIPELINE ACTUAL</Text>
      <View style={styles.pipelineCard}>
        {[
          { label: 'Hot',      num: activos.filter(c => c.temperature === 'hot').length,  color: T.red },
          { label: 'Warm',     num: activos.filter(c => c.temperature === 'warm').length, color: T.warm },
          { label: 'Cold',     num: activos.filter(c => c.temperature === 'cold').length, color: T.blue },
          { label: 'Cerrados', num: vendidos.length,                                       color: T.green },
        ].map((r, i, arr) => (
          <View key={r.label} style={[styles.pipeRow, i === arr.length-1 && { borderBottomWidth: 0 }]}>
            <View style={styles.inlineRow}>
              <View style={[styles.dot, { backgroundColor: r.color }]} />
              <Text style={styles.pipeLabel}>{r.label}</Text>
            </View>
            <View style={styles.pipeRight}>
              <View style={[styles.pipeBar, { width: clients.length > 0 ? Math.max((r.num / clients.length) * 110, 4) : 4, backgroundColor: r.color }]} />
              <Text style={[styles.pipeNum, { color: r.color }]}>{r.num}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>NOTIFICACIONES</Text>
      <View style={styles.notifCard}>
        <View style={[styles.toolIcon, { backgroundColor: '#04dedf18' }]}>
          <Ionicons name="notifications" size={20} color={T.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolTitle}>Recordatorio diario</Text>
          <Text style={styles.toolSub}>Un aviso cada mañana con tus leads del día</Text>
        </View>
        <Switch
          value={notifActivas}
          onValueChange={toggleNotificaciones}
          trackColor={{ false: T.border, true: T.accent }}
          thumbColor="#fff"
        />
      </View>

      <Text style={styles.sectionLabel}>HERRAMIENTAS</Text>

      {HERRAMIENTAS.map(h => (
        <TouchableOpacity key={h.titulo} style={styles.toolBtn} onPress={h.onPress} activeOpacity={0.7}>
          <View style={[styles.toolIcon, { backgroundColor: h.color + '18' }]}>
            <Ionicons name={h.icon as any} size={20} color={h.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toolTitle}>{h.titulo}</Text>
            <Text style={styles.toolSub}>{h.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={T.muted} />
        </TouchableOpacity>
      ))}

      {isAdmin && (
        <TouchableOpacity style={styles.toolBtn} onPress={() => router.push('/admin')} activeOpacity={0.7}>
          <View style={[styles.toolIcon, { backgroundColor: '#7C3AED18' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toolTitle}>Panel de administrador</Text>
            <Text style={styles.toolSub}>Gestionar usuarios y suscripciones</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={T.muted} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={cerrarSesion} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={18} color={T.red} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={styles.legalRow}>
        <TouchableOpacity onPress={() => Linking.openURL(URL_TERMINOS)}>
          <Text style={styles.legalLink}>Términos y Condiciones</Text>
        </TouchableOpacity>
        <Text style={styles.legalSep}>·</Text>
        <TouchableOpacity onPress={() => Linking.openURL(URL_PRIVACIDAD)}>
          <Text style={styles.legalLink}>Política de Privacidad</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>{APP_FOOTER}</Text>

      {/* Modal editar perfil */}
      <Modal visible={modalPerfil} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitulo}>Tu perfil</Text>

              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput style={styles.input} placeholder="Ej: Carlos Mendoza" placeholderTextColor={T.muted} value={nombreVendedor} onChangeText={setNombreVendedor} />

              <Text style={styles.inputLabel}>Concesionaria</Text>
              <TextInput style={styles.input} placeholder="Ej: Auto Americana" placeholderTextColor={T.muted} value={concesionaria} onChangeText={setConcesionaria} />

              <Text style={styles.inputLabel}>Marca que vendés</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {MARCAS.map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMarcaVehiculo(marcaVehiculo === m ? '' : m)}
                    style={{
                      paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20,
                      backgroundColor: marcaVehiculo === m ? (MARCA_COLORES[m] || T.accent) : T.bg,
                      borderWidth: 1, borderColor: marcaVehiculo === m ? (MARCA_COLORES[m] || T.accent) : T.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: marcaVehiculo === m ? '#fff' : T.textSub }}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {marcaVehiculo && MARCA_LOGOS[marcaVehiculo] ? (
                <View style={{ alignItems: 'center', marginTop: 16, padding: 14, backgroundColor: T.bg, borderRadius: 12 }}>
                  <Image source={{ uri: MARCA_LOGOS[marcaVehiculo] }} style={{ width: 50, height: 50, resizeMode: 'contain' }} />
                  <Text style={{ color: T.muted, fontSize: 11, marginTop: 6 }}>Logo de {marcaVehiculo}</Text>
                </View>
              ) : null}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalPerfil(false)}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGuardar} onPress={guardarPerfil} disabled={guardando}>
                  {guardando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.btnGuardarText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal meta mensual */}
      <Modal visible={editandoMeta} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={[styles.inlineRow, { marginBottom: 6 }]}>
              <Ionicons name="flag" size={19} color={NEGRO} />
              <Text style={styles.modalTitulo}>Meta del mes</Text>
            </View>
            <Text style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>¿Cuántas ventas querés cerrar este mes?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 5"
              placeholderTextColor={T.muted}
              value={metaInput}
              onChangeText={setMetaInput}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setEditandoMeta(false)}>
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarMeta}>
                <Text style={styles.btnGuardarText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalExportar} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitulo}>Descargar mis clientes</Text>
            <Text style={styles.modalSub}>Elegí el formato para respaldar tu cartera de {clients.length} cliente{clients.length !== 1 ? 's' : ''}.</Text>

            <TouchableOpacity
              style={styles.exportOpcion}
              onPress={() => { setModalExportar(false); exportarCartera('pdf') }}
              activeOpacity={0.8}
            >
              <View style={[styles.exportIcon, { backgroundColor: '#DC262618' }]}>
                <Ionicons name="document-text" size={22} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportTitulo}>PDF</Text>
                <Text style={styles.exportSub}>Presentable, listo para imprimir o compartir</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportOpcion}
              onPress={() => { setModalExportar(false); exportarCartera('csv') }}
              activeOpacity={0.8}
            >
              <View style={[styles.exportIcon, { backgroundColor: '#05966918' }]}>
                <Ionicons name="grid" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportTitulo}>Excel / CSV</Text>
                <Text style={styles.exportSub}>Para abrir en Excel o Google Sheets</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.muted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelar} onPress={() => setModalExportar(false)}>
              <Text style={styles.modalCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: T.bg },
  content:           { padding: 20, paddingTop: 20, paddingBottom: 60 },
  inlineRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconCircle:        { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  perfilCard:        { backgroundColor: T.white, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14, borderWidth: 0.5, borderColor: T.border },
  avatarContainer:   { position: 'relative' },
  avatarImg:         { width: 64, height: 64, borderRadius: 32 },
  avatarGrande:      { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarLetra:       { color: '#fff', fontSize: 26, fontWeight: '800' },
  avatarEditBadge:   { position: 'absolute', bottom: -2, right: -2, backgroundColor: T.white, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: T.border },
  perfilInfo:        { flex: 1 },
  saludo:            { color: T.muted, fontSize: 12, fontWeight: '500' },
  nombre:            { color: NEGRO, fontSize: 19, fontWeight: '800', letterSpacing: -0.4, marginTop: 1 },
  concesionariaText: { color: T.muted, fontSize: 11.5 },
  marcaLogoRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  marcaLogoSmall:    { width: 24, height: 24 },
  marcaNombre:       { fontSize: 11.5, fontWeight: '700' },
  marcaBadge:        { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, marginTop: 7, alignSelf: 'flex-start' },
  marcaBadgeText:    { color: '#fff', fontSize: 10, fontWeight: '800' },
  editIconBtn:       { padding: 4 },

  modalSub:          { color: T.muted, fontSize: 13, marginTop: 6, marginBottom: 18 },
  exportOpcion:      { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: T.bg, borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 0.5, borderColor: T.border },
  exportIcon:        { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  exportTitulo:      { color: NEGRO, fontSize: 15, fontWeight: '800' },
  exportSub:         { color: T.muted, fontSize: 12, marginTop: 2 },
  modalCancelar:     { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  modalCancelarText: { color: T.textSub, fontSize: 14, fontWeight: '700' },
  trialCard:         { backgroundColor: T.white, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, borderWidth: 1 },
  trialTitulo:       { fontSize: 14, fontWeight: '800' },
  trialSub:          { color: T.muted, fontSize: 11.5, marginTop: 2 },

  rachaCard:         { backgroundColor: T.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 18, borderWidth: 0.5, borderColor: T.border },
  rachaNum:          { color: NEGRO, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  rachaSub:          { color: T.muted, fontSize: 12, marginTop: 3 },

  metaCard:          { backgroundColor: T.white, borderRadius: 16, padding: 16, marginBottom: 18, borderWidth: 0.5, borderColor: T.border },
  metaNum:           { color: NEGRO, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 },
  metaLabel:         { color: T.muted, fontSize: 12, marginTop: 1 },
  metaBarBg:         { height: 8, backgroundColor: T.bg, borderRadius: 4, overflow: 'hidden', marginBottom: 9 },
  metaBarFill:       { height: 8, borderRadius: 4 },
  metaPct:           { fontSize: 12, fontWeight: '600' },

  insigniasGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  insigniaCard:      { width: '31.5%', backgroundColor: T.white, borderRadius: 14, padding: 11, alignItems: 'center', borderWidth: 0.5, borderColor: T.border },
  insigniaIconWrap:  { width: 38, height: 38, borderRadius: 19, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  insigniaLabel:     { color: NEGRO, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  insigniaDesc:      { color: T.muted, fontSize: 9, textAlign: 'center', marginTop: 3 },

  sectionLabel:      { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 11, marginTop: 4 },
  notifCard:         { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: T.white, borderRadius: 16, padding: 15, marginBottom: 20, borderWidth: 0.5, borderColor: T.border },

  statsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard:          { width: '48.5%', backgroundColor: T.white, borderRadius: 16, padding: 15, borderWidth: 0.5, borderColor: T.border },
  statNum:           { fontSize: 27, fontWeight: '800', letterSpacing: -1 },
  statLabel:         { color: T.muted, fontSize: 11, marginTop: 2, fontWeight: '500' },

  promedioCard:      { backgroundColor: T.accentDim, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, borderWidth: 0.5, borderColor: T.accent + '44' },
  promedioNum:       { fontSize: 27, fontWeight: '800', color: T.accentText, letterSpacing: -0.6 },
  promedioLabel:     { color: T.accentText, fontSize: 13, fontWeight: '600', marginTop: 2 },
  promedioSub:       { color: T.accentDark, fontSize: 11, marginTop: 3 },

  referidosCard:     { backgroundColor: '#8B5CF610', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20, borderWidth: 0.5, borderColor: '#8B5CF633' },
  referidosIcon:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#8B5CF61A', alignItems: 'center', justifyContent: 'center' },
  referidosNum:      { color: '#5B21B6', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  referidosLabel:    { fontSize: 14, fontWeight: '600', color: '#7C3AED' },
  referidosSub:      { color: '#7C3AED', fontSize: 12, marginTop: 2, opacity: 0.8 },
  pipelineCard:      { backgroundColor: T.white, borderRadius: 16, padding: 15, marginBottom: 20, borderWidth: 0.5, borderColor: T.border },
  pipeRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: T.border },
  dot:               { width: 8, height: 8, borderRadius: 4 },
  pipeLabel:         { color: NEGRO, fontSize: 13, fontWeight: '600' },
  pipeRight:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pipeBar:           { height: 6, borderRadius: 3 },
  pipeNum:           { fontSize: 14, fontWeight: '800', minWidth: 20, textAlign: 'right' },

  toolBtn:           { backgroundColor: T.white, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 9, borderWidth: 0.5, borderColor: T.border },
  toolIcon:          { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolTitle:         { color: NEGRO, fontSize: 14, fontWeight: '700' },
  toolSub:           { color: T.muted, fontSize: 11.5, marginTop: 2 },

  logoutBtn:         { backgroundColor: T.white, borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, borderWidth: 0.5, borderColor: T.red + '40' },
  logoutText:        { color: T.red, fontSize: 14.5, fontWeight: '700' },
  legalRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 },
  legalLink:         { color: T.muted, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  legalSep:          { color: T.muted, fontSize: 12 },
  footer:            { textAlign: 'center', color: T.muted, fontSize: 11, marginTop: 14, fontWeight: '500' },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:         { backgroundColor: T.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 12, paddingBottom: 40 },
  modalHandle:       { width: 38, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 18 },
  modalTitulo:       { color: NEGRO, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  inputLabel:        { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 7, marginTop: 14 },
  input:             { backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: NEGRO, fontSize: 14, borderWidth: 0.5, borderColor: T.border },
  modalBtns:         { flexDirection: 'row', gap: 10, marginTop: 26 },
  btnCancelar:       { flex: 1, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText:   { color: T.textSub, fontWeight: '700', fontSize: 14 },
  btnGuardar:        { flex: 1.4, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: NEGRO },
  btnGuardarText:    { color: '#fff', fontWeight: '800', fontSize: 14 },
})
