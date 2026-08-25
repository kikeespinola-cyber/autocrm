import { mensajeError } from '../lib/errores'
import { pedirPermisos, programarRecordatorioDiario } from '../lib/notificaciones'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import React, { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'
import { necesitaContactoHoy, proximoContactoTexto, tieneFechaFijada, esAnteriorAHoy } from '../lib/protocolo'
import { T, tempColor, tempDim, tempTextColor, tempLabel } from '../lib/theme'
import { APP_NAME } from '../lib/marca'
import { supabase } from '../lib/supabase'
import Tooltip from '../components/Tooltip'
import { tooltipVisto, marcarTooltipVisto } from '../lib/tooltips'
import * as Clipboard from 'expo-clipboard'

const NEGRO = '#1A1A2E'

let _accesoVerificado = false

export default function HoyScreen() {
  const router = useRouter()
  const [clients, setClients]               = useState<Client[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [mostrarTooltip, setMostrarTooltip] = useState(false)
  const [reunionesHoy, setReunionesHoy]     = useState<any[]>([])
  const [copiado, setCopiado]               = useState<string | null>(null)
  const [diasTrial, setDiasTrial]           = useState<number | null>(null)
  const [refreshing, setRefreshing]         = useState(false)

  useEffect(() => {
    pedirPermisos().then(granted => {
      if (granted) programarRecordatorioDiario()
    })
    _accesoVerificado = false
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      cargar()
      verificarAcceso()
    }, [])
  )

  async function verificarAcceso() {
    if (_accesoVerificado) return
    _accesoVerificado = true

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('subscriptions')
      .select('onboarding_completado, status, current_period_end')
      .eq('user_id', user.id)
      .single()

    if (!data) return

    if (data.status === 'trial' && data.current_period_end) {
      const vencio = new Date(data.current_period_end) < new Date()
      if (vencio) { router.replace('/trial-vencido'); return }
    }

    if (!data.onboarding_completado) {
      router.replace('/onboarding')
      return
    }

    tooltipVisto('tu_dia').then(visto => {
      if (!visto) setMostrarTooltip(true)
    })
  }

  async function cargar() {
    setLoading(true)
    try {
      const data = await getClients()
      setClients(data)
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setLoading(false)
    }

    const { data: { user } } = await supabase.auth.getUser()
    // Sin sesión no seguimos: todo lo de abajo filtra por user_id y con undefined
    // la query sale mal formada. El guard de _layout se encarga de mandar a /login.
    if (!user) return

    const hoyISO = new Date().toISOString().split('T')[0]
    const { data: r } = await supabase
      .from('reuniones')
      .select('*')
      .eq('user_id', user?.id)
      .eq('fecha', hoyISO)
      .eq('completada', false)
      .order('hora', { ascending: true })
    if (r) setReunionesHoy(r)

    // Dias restantes de trial (para el banner)
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user?.id)
      .single()
    if (sub?.status === 'trial' && sub.current_period_end) {
      const dias = Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      setDiasTrial(dias)
    } else {
      setDiasTrial(null)
    }
  }

  async function registrarRapido(clientId: string, type: string, content: string) {
    const cliente = clients.find(c => c.id === clientId)
    await supabase.from('interactions').insert({ client_id: clientId, type, content })
    await supabase.from('clients').update({
      last_contact_at: new Date().toISOString(),
      contact_count: (cliente?.contact_count || 0) + 1,
      // Igual que en la ficha: la fecha fijada se consume al contactar y el
      // cliente vuelve a la regla de temperatura.
      next_contact_at: null,
    }).eq('id', clientId)
    await cargar()
  }

  function copiarSaludo(c: Client) {
    const msg = `¡Hola ${c.name.split(' ')[0]}! Te escribo para desearte un feliz cumpleaños. Que lo pases genial. Un saludo de parte mía.`
    {
      Clipboard.setStringAsync(msg)
      setCopiado(c.id)
      setTimeout(() => setCopiado(null), 2000)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await cargar()
    setRefreshing(false)
  }

  const hoy      = new Date()
  const activos  = clients.filter(c => !c.sold)
  const cerrados = clients.filter(c => c.sold)
  const ahora = new Date()
  const ventasMes = clients.filter(c => {
    if (!c.sold || !c.sale_date) return false
    const f = new Date(c.sale_date)
    return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear()
  }).length
  // Una fecha fijada a mano es una promesa que le hiciste al cliente: cuando
  // vence sube a "ahora mismo" sin importar la temperatura.
  const urgentes = activos.filter(c =>
    necesitaContactoHoy(c) && (c.temperature === 'hot' || tieneFechaFijada(c))
  )
  const masTarde = activos.filter(c =>
    necesitaContactoHoy(c) && c.temperature !== 'hot' && !tieneFechaFijada(c)
  )
  const proximos = activos.filter(c => !necesitaContactoHoy(c))

  // Lead prioritario: el hot urgente con más días sin contacto (el que está por perder)
  function diasSinContacto(c: Client): number {
    if (!c.last_contact_at) return 999
    return Math.floor((Date.now() - new Date(c.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
  }
  const prioritario = urgentes.length > 0
    ? [...urgentes].sort((a, b) => diasSinContacto(b) - diasSinContacto(a))[0]
    : null
  const restantesUrgentes = prioritario ? urgentes.filter(c => c.id !== prioritario.id) : urgentes
  const cumpleHoy = clients.filter(c => {
    if (!c.birthday) return false
    const b   = c.birthday.toLowerCase()
    const dia = hoy.getDate().toString()
    const mes = hoy.toLocaleString('es-PY', { month: 'short' }).toLowerCase()
    return b.includes(dia) && b.includes(mes)
  })

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={T.accent} size="large" />
        <Text style={{ color: T.muted, fontSize: 14, marginTop: 14 }}>Cargando tu día...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Ionicons name="alert-circle-outline" size={38} color={T.red} style={{ marginBottom: 12 }} />
        <Text style={{ color: NEGRO, fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 30 }}>{error}</Text>
        <TouchableOpacity onPress={cargar} style={styles.retryBtn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  function QuickBtns({ c }: { c: Client }) {
    return (
      <View style={styles.quickBtns}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => registrarRapido(c.id, 'call', 'Llamada realizada')}>
          <Ionicons name="call" size={15} color={T.green} />
          <Text style={[styles.quickBtnText, { color: T.green }]}>Llamé</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => registrarRapido(c.id, 'whatsapp', 'WhatsApp enviado')}>
          <Ionicons name="chatbubble-ellipses" size={15} color="#25D366" />
          <Text style={[styles.quickBtnText, { color: '#25D366' }]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => registrarRapido(c.id, 'call', 'Llamada — no contestó')}>
          <Ionicons name="close-circle" size={15} color={T.red} />
          <Text style={[styles.quickBtnText, { color: T.red }]}>No atendió</Text>
        </TouchableOpacity>
      </View>
    )
  }

  function ClienteCard({ c, accionTexto, accionColor }: { c: Client; accionTexto?: string; accionColor?: string }) {
    return (
      <View style={styles.card}>
        <View style={[styles.tempStrip, { backgroundColor: tempColor(c.temperature) }]} />
        <View style={styles.cardBody}>
          <TouchableOpacity onPress={() => router.push(`/cliente/${c.id}`)} activeOpacity={0.7}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: tempDim(c.temperature) }]}>
                <Text style={[styles.avatarText, { color: tempTextColor(c.temperature) }]}>
                  {c.name.slice(0,2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{c.name}</Text>
                {accionTexto ? (
                  <Text style={[styles.cardAccion, { color: accionColor || T.textSub }]}>{accionTexto}</Text>
                ) : null}
                <Text style={styles.cardVehicle} numberOfLines={1}>
                  {c.vehicle_interest || 'Sin vehículo asignado'}
                </Text>
              </View>
              <View style={styles.badgeCol}>
                <View style={[styles.badge, { backgroundColor: tempDim(c.temperature) }]}>
                  <Text style={[styles.badgeText, { color: tempTextColor(c.temperature) }]}>
                    {tempLabel(c.temperature)}
                  </Text>
                </View>
                {tieneFechaFijada(c) && (
                  <View style={styles.fechaBadge}>
                    <Ionicons name="calendar" size={9} color={T.purpleText} />
                    <Text style={styles.fechaBadgeText}>Fijado</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
          <QuickBtns c={c} />
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#04dedf" colors={["#04dedf"]} />}
    >
      <Text style={styles.fecha}>
        {new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>
      <Text style={styles.titulo}>Tu día</Text>
      <Text style={styles.subtitulo}>
        {(() => {
          const pend = urgentes.length + masTarde.length
          if (pend > 0) return `${pend} acción${pend !== 1 ? 'es' : ''} para hoy — ¡a cerrar ventas!`
          if (ventasMes > 0) return `Vas ${ventasMes} venta${ventasMes !== 1 ? 's' : ''} este mes. ¡Seguí así!`
          return 'Todo al día. Buen momento para sumar leads.'
        })()}
      </Text>

      {diasTrial !== null && diasTrial <= 3 && (
        <TouchableOpacity
          style={styles.trialBanner}
          onPress={() => Linking.openURL('https://wa.me/595985715389?text=Hola%2C%20quiero%20continuar%20usando%20Vendix')}
          activeOpacity={0.85}
        >
          <View style={styles.trialIconWrap}>
            <Ionicons name={diasTrial <= 0 ? 'alert-circle' : 'time'} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trialTitulo}>
              {diasTrial <= 0
                ? 'Tu prueba venció'
                : diasTrial === 1
                ? 'Te queda 1 día de prueba'
                : `Te quedan ${diasTrial} días de prueba`}
            </Text>
            <Text style={styles.trialSub}>Tocá para activar tu plan y no perder acceso</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

      <View style={styles.statsRow}>
        {[
          { num: activos.length,  label: 'Activos',   color: NEGRO,   icon: 'people-outline' },
          { num: ventasMes,       label: 'Este mes',  color: T.green, icon: 'trophy-outline' },
          { num: urgentes.length, label: 'Urgentes',  color: T.red,   icon: 'alert-circle-outline' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={16} color={s.color} style={{ marginBottom: 5 }} />
            <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {reunionesHoy.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={13} color={T.muted} />
            <Text style={styles.sectionLabel}>REUNIONES DE HOY</Text>
          </View>
          {reunionesHoy.map(r => (
            <TouchableOpacity
              key={r.id}
              style={styles.card}
              onPress={() => router.push('/reuniones')}
              activeOpacity={0.7}
            >
              <View style={[styles.tempStrip, { backgroundColor: T.accent }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <View style={[styles.avatar, { backgroundColor: T.accentDim }]}>
                    <Ionicons name="calendar" size={19} color={T.accentText} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{r.titulo}</Text>
                    <View style={styles.inlineRow}>
                      <Ionicons name="time-outline" size={12} color={T.accentText} />
                      <Text style={[styles.cardAccion, { color: T.accentText }]}>{r.hora}</Text>
                    </View>
                    {r.notas && <Text style={styles.cardVehicle} numberOfLines={1}>{r.notas}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={T.muted} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {cumpleHoy.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="gift" size={13} color={T.muted} />
            <Text style={styles.sectionLabel}>CUMPLEAÑOS HOY</Text>
          </View>
          {cumpleHoy.map(c => (
            <View key={c.id} style={styles.card}>
              <View style={[styles.tempStrip, { backgroundColor: T.warm }]} />
              <View style={styles.cardBody}>
                <TouchableOpacity onPress={() => router.push(`/cliente/${c.id}`)} activeOpacity={0.7}>
                  <View style={styles.cardRow}>
                    <View style={[styles.avatar, { backgroundColor: T.warmDim }]}>
                      <Ionicons name="gift" size={19} color={T.warmText} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{c.name}</Text>
                      <Text style={[styles.cardAccion, { color: T.warmText }]}>Hoy es su cumpleaños</Text>
                      <Text style={styles.cardVehicle} numberOfLines={1}>{c.vehicle_interest}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saludoBtn}
                  onPress={() => copiarSaludo(c)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={copiado === c.id ? 'checkmark-circle' : 'copy-outline'}
                    size={15}
                    color={copiado === c.id ? T.green : T.warmText}
                  />
                  <Text style={[styles.saludoBtnText, { color: copiado === c.id ? T.green : T.warmText }]}>
                    {copiado === c.id ? 'Copiado' : 'Copiar saludo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {prioritario && (
        <TouchableOpacity
          style={styles.prioBox}
          onPress={() => router.push(`/cliente/${prioritario.id}`)}
          activeOpacity={0.9}
        >
          <View style={styles.prioHeader}>
            <Ionicons name={tieneFechaFijada(prioritario) ? 'calendar' : 'flame'} size={15} color="#fff" />
            <Text style={styles.prioLabel}>TU PRIORIDAD DE HOY</Text>
          </View>
          <Text style={styles.prioNombre}>{prioritario.name}</Text>
          <Text style={styles.prioMotivo}>
            {prioritario.next_contact_at
              ? esAnteriorAHoy(prioritario.next_contact_at)
                ? 'Se te pasó la fecha que le prometiste. Contactalo ya.'
                : 'Vos fijaste este contacto para hoy. Se lo prometiste.'
              : diasSinContacto(prioritario) >= 900
              ? 'Todavía no lo contactaste. Es tu lead más caliente.'
              : `Hace ${diasSinContacto(prioritario)} día${diasSinContacto(prioritario) !== 1 ? 's' : ''} sin contacto — está por enfriarse.`}
          </Text>
          {prioritario.vehicle_interest ? (
            <View style={styles.prioVehiculo}>
              <Ionicons name="car-sport-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.prioVehiculoText}>{prioritario.vehicle_interest}</Text>
            </View>
          ) : null}
          <View style={styles.prioActions}>
            {prioritario.phone ? (
              <TouchableOpacity
                style={styles.prioWaBtn}
                onPress={() => Linking.openURL(`https://wa.me/595${prioritario.phone?.replace(/\D/g, '')}`)}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                <Text style={styles.prioWaText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.prioVerBtn}>
              <Text style={styles.prioVerText}>Ver ficha</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {restantesUrgentes.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: T.red }]} />
            <Text style={styles.sectionLabel}>AHORA MISMO</Text>
          </View>
          {restantesUrgentes.map(c => (
            <ClienteCard
              key={c.id}
              c={c}
              accionColor={tieneFechaFijada(c) ? T.purpleText : T.red}
              accionTexto={
                tieneFechaFijada(c)
                  ? proximoContactoTexto(c)
                  : c.contact_count === 0
                  ? 'Primer contacto pendiente'
                  : `Contacto #${c.contact_count + 1} — toca hoy`
              }
            />
          ))}
        </>
      )}

      {masTarde.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: T.warm }]} />
            <Text style={styles.sectionLabel}>MÁS TARDE HOY</Text>
          </View>
          {masTarde.map(c => <ClienteCard key={c.id} c={c} />)}
        </>
      )}

      {proximos.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: T.muted }]} />
            <Text style={styles.sectionLabel}>PRÓXIMOS</Text>
          </View>
          {proximos.map(c => (
            <TouchableOpacity
              key={c.id}
              style={styles.cardSimple}
              onPress={() => router.push(`/cliente/${c.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: T.bg }]}>
                  <Text style={[styles.avatarText, { color: T.muted }]}>
                    {c.name.slice(0,2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{c.name}</Text>
                  <Text
                    style={[styles.cardAccion, tieneFechaFijada(c) && { color: T.purpleText, fontWeight: '700' }]}
                    numberOfLines={1}
                  >
                    {proximoContactoTexto(c)}
                  </Text>
                </View>
                <View style={styles.badgeCol}>
                  <View style={[styles.badge, { backgroundColor: tempDim(c.temperature) }]}>
                    <Text style={[styles.badgeText, { color: tempTextColor(c.temperature) }]}>
                      {tempLabel(c.temperature)}
                    </Text>
                  </View>
                  {tieneFechaFijada(c) && (
                    <View style={styles.fechaBadge}>
                      <Ionicons name="calendar" size={9} color={T.purpleText} />
                      <Text style={styles.fechaBadgeText}>Fijado</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {clients.length === 0 && (
        <View style={styles.welcomeBox}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="rocket" size={30} color={T.accentText} />
          </View>
          <Text style={styles.welcomeTitulo}>¡Bienvenido a {APP_NAME}!</Text>
          <Text style={styles.welcomeTexto}>
            Empezá cargando tu primer cliente. {APP_NAME} te va a decir a quién contactar cada día para que no se te escape ninguna venta.
          </Text>
          <TouchableOpacity
            style={styles.welcomeBtn}
            onPress={() => router.push('/clientes?nuevo=1')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={19} color="#fff" />
            <Text style={styles.welcomeBtnText}>Agregar mi primer cliente</Text>
          </TouchableOpacity>
        </View>
      )}

      {clients.length > 0 && activos.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={44} color={T.green} />
          <Text style={styles.emptyText}>¡Todo al día!</Text>
          <Text style={styles.emptySub}>No tenés contactos pendientes por ahora. Buen trabajo.</Text>
        </View>
      )}

      <Tooltip
        visible={mostrarTooltip}
        titulo="Tu día"
        descripcion="Acá aparecen los clientes que necesitan contacto hoy. Priorizados automáticamente — los más urgentes arriba. Tocá un cliente para ver su ficha o usá los botones rápidos para registrar un contacto sin abrirla."
        onCerrar={() => { setMostrarTooltip(false); marcarTooltipVisto('tu_dia') }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: T.bg },
  content:      { padding: 20, paddingTop: 24, paddingBottom: 100 },
  loading:      { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  retryBtn:     { marginTop: 18, backgroundColor: NEGRO, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  inlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },

  fecha:        { color: T.muted, fontSize: 12, letterSpacing: 0.4, textTransform: 'capitalize', fontWeight: '500' },
  titulo:       { color: NEGRO, fontSize: 28, fontWeight: '800', marginTop: 3, letterSpacing: -0.8 },
  subtitulo:    { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 20, fontWeight: '500' },

  trialBanner:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 18 },
  trialIconWrap:{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  trialTitulo:  { color: '#fff', fontSize: 14, fontWeight: '800' },
  trialSub:     { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, marginTop: 2 },
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 24 },
  prioBox:      { backgroundColor: '#EF4444', borderRadius: 20, padding: 20, marginBottom: 22, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  prioHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  prioLabel:    { color: '#fff', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, opacity: 0.9 },
  prioNombre:   { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  prioMotivo:   { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 20, marginTop: 4 },
  prioVehiculo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  prioVehiculoText: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: '500' },
  prioActions:  { flexDirection: 'row', gap: 10, marginTop: 18 },
  prioWaBtn:    { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  prioWaText:   { color: '#1A1A2E', fontSize: 13.5, fontWeight: '800' },
  prioVerBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 11 },
  prioVerText:  { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  statCard:     { flex: 1, backgroundColor: T.white, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: T.border },
  statNum:      { fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  statLabel:    { color: T.muted, fontSize: 11, marginTop: 2, fontWeight: '500' },

  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11, marginTop: 6 },
  sectionLabel: { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  dot:          { width: 7, height: 7, borderRadius: 3.5 },

  card:         { backgroundColor: T.white, borderRadius: 16, marginBottom: 9, borderWidth: 0.5, borderColor: T.border, flexDirection: 'row', overflow: 'hidden' },
  cardSimple:   { backgroundColor: T.white, borderRadius: 16, padding: 14, marginBottom: 9, borderWidth: 0.5, borderColor: T.border },
  tempStrip:    { width: 4 },
  cardBody:     { flex: 1, padding: 14 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 14, fontWeight: '800' },
  cardInfo:     { flex: 1 },
  cardName:     { color: NEGRO, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  cardAccion:   { color: T.textSub, fontSize: 12, marginTop: 2 },
  cardVehicle:  { color: T.muted, fontSize: 11.5, marginTop: 2 },

  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:    { fontSize: 10.5, fontWeight: '700' },
  badgeCol:      { alignItems: 'flex-end', gap: 4 },
  fechaBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: T.purpleDim },
  fechaBadgeText:{ color: T.purpleText, fontSize: 9.5, fontWeight: '800' },

  quickBtns:    { flexDirection: 'row', gap: 6, marginTop: 12, paddingTop: 11, borderTopWidth: 0.5, borderTopColor: T.border },
  quickBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10, backgroundColor: T.bg },
  quickBtnText: { fontSize: 11, fontWeight: '700' },

  saludoBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: T.warmDim },
  saludoBtnText:{ fontSize: 12, fontWeight: '700' },

  empty:        { alignItems: 'center', marginTop: 70, gap: 8 },
  emptyText:    { color: NEGRO, fontSize: 16, fontWeight: '700' },
  emptySub:     { color: T.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
  welcomeBox:   { alignItems: 'center', marginTop: 40, backgroundColor: T.white, borderRadius: 20, padding: 26, borderWidth: 0.5, borderColor: T.border },
  welcomeIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  welcomeTitulo:{ color: NEGRO, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 10 },
  welcomeTexto: { color: T.textSub, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 22 },
  welcomeBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: NEGRO, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 24, alignSelf: 'stretch' },
  welcomeBtnText:{ color: '#fff', fontSize: 15, fontWeight: '800' },
})
