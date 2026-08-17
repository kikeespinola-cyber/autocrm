import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'
import { APP_NAME } from '../lib/marca'

const NEGRO = '#1A1A2E'

interface Usuario {
  user_id: string
  email: string
  status: string
  current_period_end: string
  is_admin: boolean
  onboarding_completado: boolean
  nombre_vendedor: string | null
  concesionaria: string | null
  created_at: string
}

const FILTROS = [
  { key: 'todos',    label: 'Todos' },
  { key: 'active',   label: 'Activos',   color: '#10B981' },
  { key: 'trial',    label: 'Trial',     color: '#04dedf' },
  { key: 'inactive', label: 'Inactivos', color: '#EF4444' },
]

// ---- Configuración financiera (ajustá estos valores según tus costos reales) ----
const PRECIO_MENSUAL_USD   = 7      // lo que cobrás por vendedor/mes (Gs. 50.000 aprox)
const COSTO_SUPABASE_USD   = 25     // costo fijo mensual de Supabase Pro
const COSTO_IA_POR_VEND_USD = 2     // presupuesto de IA por vendedor/mes (con adaptación)
const USD_A_GS = 7300               // cotización aprox para mostrar en guaraníes

export default function AdminScreen() {
  const [usuarios, setUsuarios]     = useState<Usuario[]>([])
  const [loading, setLoading]       = useState(true)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [checkeando, setCheckeando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [verFinanzas, setVerFinanzas] = useState(false)
  const [search, setSearch]         = useState('')
  const [filtro, setFiltro]         = useState('todos')

  useEffect(() => { verificar() }, [])

  async function verificar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCheckeando(false); return }

    const { data } = await supabase
      .from('subscriptions')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (data?.is_admin) {
      setIsAdmin(true)
      await cargarUsuarios()
    }
    setCheckeando(false)
  }

  async function cargarUsuarios() {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('obtener_usuarios_con_email')
      if (error) throw error
      if (data) setUsuarios(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function activar30Dias(userId: string) {
    await supabase.from('subscriptions').update({
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('user_id', userId)
    await cargarUsuarios()
  }

  function desactivar(userId: string) {
    Alert.alert(
      '¿Desactivar este usuario?',
      `Va a perder el acceso a ${APP_NAME} hasta que lo reactives.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('subscriptions').update({
              status: 'inactive',
              current_period_end: new Date().toISOString(),
            }).eq('user_id', userId)
            await cargarUsuarios()
          },
        },
      ]
    )
  }

  async function crearSuscripcion(userId: string) {
    await supabase.from('subscriptions').insert({
      user_id: userId,
      status: 'trial',
      plan: 'individual',
      current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      is_admin: false,
      onboarding_completado: false,
    })
  }

  async function sincronizar() {
    setSincronizando(true)
    try {
      const { data: sinSub } = await supabase.rpc('usuarios_sin_suscripcion')
      if (sinSub && sinSub.length > 0) {
        for (const u of sinSub) {
          await crearSuscripcion(u.id)
        }
        Alert.alert('Listo', `Se crearon ${sinSub.length} suscripción${sinSub.length !== 1 ? 'es' : ''} pendiente${sinSub.length !== 1 ? 's' : ''}`)
      } else {
        Alert.alert('Todo en orden', 'No hay usuarios sin suscripción')
      }
      await cargarUsuarios()
    } catch (e) {
      Alert.alert('Error', 'No se pudo sincronizar')
    } finally {
      setSincronizando(false)
    }
  }

  if (checkeando) return (
    <View style={styles.loading}>
      <ActivityIndicator color={NEGRO} size="small" />
      <Text style={styles.loadingText}>Verificando acceso...</Text>
    </View>
  )

  if (!isAdmin) return (
    <View style={styles.loading}>
      <View style={styles.lockBox}>
        <Ionicons name="lock-closed" size={30} color={T.muted} />
      </View>
      <Text style={styles.restrictTitle}>Acceso restringido</Text>
      <Text style={styles.restrictSub}>Esta sección es solo para administradores.</Text>
    </View>
  )

  const activos    = usuarios.filter(u => u.status === 'active').length
  const enTrial    = usuarios.filter(u => u.status === 'trial').length
  const inactivos  = usuarios.filter(u => u.status === 'inactive').length

  // ---- Cálculo financiero automático ----
  const ingresosUSD    = activos * PRECIO_MENSUAL_USD
  const costoIAUSD     = activos * COSTO_IA_POR_VEND_USD
  const costoTotalUSD  = COSTO_SUPABASE_USD + costoIAUSD
  const gananciaUSD    = ingresosUSD - costoTotalUSD
  const fmtUSD = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US')
  const fmtGs  = (n: number) => 'Gs. ' + Math.round(n * USD_A_GS).toLocaleString('es-PY')

  const filtrados = usuarios.filter(u => {
    if (filtro !== 'todos' && u.status !== filtro) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.nombre_vendedor || '').toLowerCase().includes(q) ||
      (u.concesionaria || '').toLowerCase().includes(q)
    )
  })

  function statusInfo(status: string) {
    if (status === 'active')   return { color: T.green,      dim: T.greenDim,  label: 'Activo',   icon: 'checkmark-circle' }
    if (status === 'trial')    return { color: T.accentText, dim: T.accentDim, label: 'Trial',    icon: 'time' }
    return { color: T.red, dim: T.redDim, label: 'Inactivo', icon: 'close-circle' }
  }

  function contarPorStatus(key: string) {
    if (key === 'todos') return usuarios.length
    return usuarios.filter(u => u.status === key).length
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.titulo}>Administrador</Text>
      <Text style={styles.sub}>{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}</Text>

      <View style={styles.statsRow}>
        {[
          { num: activos,   label: 'Activos',   color: T.green,      icon: 'checkmark-circle-outline' },
          { num: enTrial,   label: 'En trial',  color: T.accentText, icon: 'time-outline' },
          { num: inactivos, label: 'Inactivos', color: T.red,        icon: 'close-circle-outline' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={15} color={s.color} style={{ marginBottom: 6 }} />
            <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Panel financiero */}
      <TouchableOpacity
        style={styles.finToggle}
        onPress={() => setVerFinanzas(!verFinanzas)}
        activeOpacity={0.8}
      >
        <View style={styles.finToggleLeft}>
          <View style={styles.finToggleIcon}>
            <Ionicons name="wallet" size={17} color="#fff" />
          </View>
          <View>
            <Text style={styles.finToggleTitulo}>Finanzas del mes</Text>
            <Text style={styles.finToggleSub}>
              {gananciaUSD >= 0 ? `Ganás ${fmtUSD(gananciaUSD)} este mes` : `Estás ${fmtUSD(gananciaUSD)} este mes`}
            </Text>
          </View>
        </View>
        <Ionicons name={verFinanzas ? 'chevron-up' : 'chevron-down'} size={20} color={T.muted} />
      </TouchableOpacity>

      {verFinanzas && (
        <View style={styles.finPanel}>
          {/* Ingresos */}
          <View style={styles.finRow}>
            <View style={styles.finRowLeft}>
              <Ionicons name="arrow-down-circle" size={17} color={T.green} />
              <Text style={styles.finRowLabel}>Ingresos ({activos} activo{activos !== 1 ? 's' : ''})</Text>
            </View>
            <Text style={[styles.finRowValue, { color: T.green }]}>{fmtUSD(ingresosUSD)}</Text>
          </View>
          <Text style={styles.finRowGs}>{fmtGs(ingresosUSD)}</Text>

          <View style={styles.finDivider} />

          {/* Costos */}
          <Text style={styles.finSectionLabel}>COSTOS FIJOS</Text>
          <View style={styles.finRow}>
            <View style={styles.finRowLeft}>
              <Ionicons name="server-outline" size={16} color={T.textSub} />
              <Text style={styles.finRowLabel}>Supabase Pro</Text>
            </View>
            <Text style={styles.finRowValue}>{fmtUSD(COSTO_SUPABASE_USD)}</Text>
          </View>

          <Text style={[styles.finSectionLabel, { marginTop: 10 }]}>COSTOS VARIABLES</Text>
          <View style={styles.finRow}>
            <View style={styles.finRowLeft}>
              <Ionicons name="sparkles-outline" size={16} color={T.textSub} />
              <Text style={styles.finRowLabel}>IA ({activos} × {fmtUSD(COSTO_IA_POR_VEND_USD)})</Text>
            </View>
            <Text style={styles.finRowValue}>{fmtUSD(costoIAUSD)}</Text>
          </View>

          <View style={styles.finRow}>
            <View style={styles.finRowLeft}>
              <Ionicons name="remove-circle" size={17} color={T.red} />
              <Text style={[styles.finRowLabel, { fontWeight: '700' }]}>Total costos</Text>
            </View>
            <Text style={[styles.finRowValue, { color: T.red }]}>{fmtUSD(costoTotalUSD)}</Text>
          </View>

          <View style={styles.finDivider} />

          {/* Ganancia */}
          <View style={[styles.finGananciaBox, { backgroundColor: gananciaUSD >= 0 ? T.greenDim : T.redDim }]}>
            <View>
              <Text style={[styles.finGananciaLabel, { color: gananciaUSD >= 0 ? T.green : T.red }]}>
                {gananciaUSD >= 0 ? 'GANANCIA NETA' : 'PÉRDIDA'}
              </Text>
              <Text style={[styles.finGananciaGs, { color: gananciaUSD >= 0 ? T.green : T.red }]}>
                {fmtGs(gananciaUSD)}
              </Text>
            </View>
            <Text style={[styles.finGananciaNum, { color: gananciaUSD >= 0 ? T.green : T.red }]}>
              {fmtUSD(gananciaUSD)}
            </Text>
          </View>

          {activos < 5 && (
            <View style={styles.finTip}>
              <Ionicons name="bulb-outline" size={14} color={T.warmText} />
              <Text style={styles.finTipText}>
                Con {5 - activos} vendedor{5 - activos !== 1 ? 'es' : ''} más llegás al punto de equilibrio.
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={T.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por email, nombre o concesionaria"
          placeholderTextColor={T.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {FILTROS.map(f => {
          const act = filtro === f.key
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFiltro(f.key)}
              style={[styles.chip, act && styles.chipActivo]}
              activeOpacity={0.8}
            >
              {f.color && <View style={[styles.chipDot, { backgroundColor: f.color }]} />}
              <Text style={[styles.chipText, act && { color: '#fff' }]}>{f.label}</Text>
              <View style={[styles.chipCount, act && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.chipCountText, act && { color: '#fff' }]}>{contarPorStatus(f.key)}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={NEGRO} size="small" />
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
        </View>
      ) : filtrados.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="people-outline" size={40} color={T.muted} />
          <Text style={styles.emptyText}>Sin resultados</Text>
          <Text style={styles.emptySub}>Probá con otro filtro o búsqueda</Text>
        </View>
      ) : filtrados.map(u => {
        const st = statusInfo(u.status)
        return (
          <View key={u.user_id} style={styles.card}>
            <View style={[styles.strip, { backgroundColor: st.color }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.emailRow}>
                    <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
                    {u.is_admin && (
                      <Ionicons name="shield-checkmark" size={13} color="#7C3AED" />
                    )}
                  </View>
                  {u.nombre_vendedor && <Text style={styles.nombre}>{u.nombre_vendedor}</Text>}
                  {u.concesionaria && (
                    <View style={styles.metaRow}>
                      <Ionicons name="business-outline" size={11} color={T.muted} />
                      <Text style={styles.concesionaria}>{u.concesionaria}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: st.dim }]}>
                  <Ionicons name={st.icon as any} size={11} color={st.color} />
                  <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={12} color={T.muted} />
                  <Text style={styles.infoText}>
                    Vence {u.current_period_end ? new Date(u.current_period_end).toLocaleDateString('es-PY') : '—'}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons
                    name={u.onboarding_completado ? 'checkmark-circle' : 'ellipse-outline'}
                    size={12}
                    color={u.onboarding_completado ? T.green : T.muted}
                  />
                  <Text style={styles.infoText}>Onboarding</Text>
                </View>
              </View>

              <View style={styles.btns}>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => activar30Dias(u.user_id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={14} color={T.green} />
                  <Text style={[styles.btnText, { color: T.green }]}>30 días</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => desactivar(u.user_id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="ban-outline" size={14} color={T.red} />
                  <Text style={[styles.btnText, { color: T.red }]}>Desactivar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )
      })}

      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={sincronizar}
        disabled={sincronizando}
        activeOpacity={0.8}
      >
        {sincronizando ? (
          <ActivityIndicator color={T.accentText} size="small" />
        ) : (
          <Ionicons name="sync" size={16} color={T.accentText} />
        )}
        <Text style={styles.refreshBtnText}>
          {sincronizando ? 'Sincronizando...' : 'Sincronizar usuarios sin suscripción'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: T.bg },
  content:        { padding: 20, paddingTop: 24, paddingBottom: 60 },

  loading:        { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 },
  loadingText:    { color: T.muted, fontSize: 13.5 },
  centerBox:      { alignItems: 'center', marginTop: 50, gap: 10 },
  emptyText:      { color: NEGRO, fontSize: 16, fontWeight: '700' },
  emptySub:       { color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 2 },

  lockBox:        { width: 70, height: 70, borderRadius: 24, backgroundColor: T.white, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: T.border, marginBottom: 6 },
  restrictTitle:  { color: NEGRO, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  restrictSub:    { color: T.muted, fontSize: 13.5, textAlign: 'center' },

  titulo:         { color: NEGRO, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  sub:            { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 18, fontWeight: '500' },

  statsRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard:       { flex: 1, backgroundColor: T.white, borderRadius: 14, padding: 13, borderWidth: 0.5, borderColor: T.border },
  statNum:        { fontSize: 23, fontWeight: '800', letterSpacing: -0.8 },
  statLabel:      { color: T.muted, fontSize: 10.5, marginTop: 2, fontWeight: '500' },

  finToggle:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.white, borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 0.5, borderColor: T.border },
  finToggleLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  finToggleIcon:  { width: 38, height: 38, borderRadius: 12, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  finToggleTitulo:{ color: NEGRO, fontSize: 15, fontWeight: '800' },
  finToggleSub:   { color: T.muted, fontSize: 12, marginTop: 2 },
  finPanel:       { backgroundColor: T.white, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 0.5, borderColor: T.border },
  finRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  finRowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 9 },
  finRowLabel:    { color: T.textSub, fontSize: 13 },
  finRowValue:    { color: NEGRO, fontSize: 14, fontWeight: '700' },
  finRowGs:       { color: T.muted, fontSize: 11, textAlign: 'right', marginTop: -2 },
  finSectionLabel:{ color: T.muted, fontSize: 9.5, fontWeight: '700', letterSpacing: 1, marginTop: 4, marginBottom: 2 },
  finDivider:     { height: 0.5, backgroundColor: T.border, marginVertical: 11 },
  finGananciaBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 13, padding: 15 },
  finGananciaLabel:{ fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  finGananciaGs:  { fontSize: 13, fontWeight: '600', marginTop: 3 },
  finGananciaNum: { fontSize: 26, fontWeight: '800', letterSpacing: -0.8 },
  finTip:         { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: T.warmDim, borderRadius: 11, padding: 11, marginTop: 12 },
  finTipText:     { color: T.warmText, fontSize: 11.5, flex: 1 },
  searchBox:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14, borderWidth: 0.5, borderColor: T.border },
  searchInput:    { flex: 1, color: NEGRO, fontSize: 13.5 },

  chipsScroll:    { marginBottom: 18, marginHorizontal: -20 },
  chipsRow:       { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, backgroundColor: T.white, borderWidth: 0.5, borderColor: T.border },
  chipActivo:     { backgroundColor: NEGRO, borderColor: NEGRO },
  chipDot:        { width: 7, height: 7, borderRadius: 3.5 },
  chipText:       { fontSize: 12.5, fontWeight: '600', color: T.textSub },
  chipCount:      { backgroundColor: T.bg, borderRadius: 10, minWidth: 20, paddingHorizontal: 5, paddingVertical: 1, alignItems: 'center' },
  chipCountText:  { fontSize: 10.5, fontWeight: '800', color: T.muted },

  card:           { backgroundColor: T.white, borderRadius: 16, marginBottom: 10, borderWidth: 0.5, borderColor: T.border, flexDirection: 'row', overflow: 'hidden' },
  strip:          { width: 4 },
  cardBody:       { flex: 1, padding: 15 },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 11 },
  emailRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  email:          { color: NEGRO, fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
  nombre:         { color: T.textSub, fontSize: 12.5, marginTop: 3 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  concesionaria:  { color: T.muted, fontSize: 11 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  statusText:     { fontSize: 10.5, fontWeight: '700' },

  cardInfo:       { flexDirection: 'row', gap: 16, marginBottom: 12 },
  infoItem:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText:       { color: T.muted, fontSize: 11 },

  btns:           { flexDirection: 'row', gap: 8 },
  btn:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11, backgroundColor: T.bg },
  btnText:        { fontSize: 12, fontWeight: '700' },

  refreshBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.white, borderRadius: 15, paddingVertical: 16, marginTop: 10, borderWidth: 0.5, borderColor: T.accent + '55' },
  refreshBtnText: { color: T.accentText, fontSize: 13, fontWeight: '700' },
})
