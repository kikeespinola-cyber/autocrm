import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, Linking, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Client, Interaction } from '../../lib/types'
import { supabase } from '../../lib/supabase'
import { generarSugerencia } from '../../lib/ia'
import { useTipoCambio } from '../../hooks/useTipoCambio'
import { elegirImagen, subirImagen } from '../../lib/imagenService'
import { T, tempColor, tempDim, tempTextColor, tempLabel } from '../../lib/theme'
import * as Clipboard from 'expo-clipboard'

const NEGRO = '#1A1A2E'

const INTERACTION_ICON: Record<string, any> = {
  call:     'call',
  whatsapp: 'logo-whatsapp',
  visit:    'business',
  note:     'document-text',
  lead:     'globe-outline',
  sale:     'trophy',
}

const INTERACTION_COLOR: Record<string, string> = {
  call:     '#10B981',
  whatsapp: '#25D366',
  visit:    '#8B5CF6',
  note:     '#4A8AE8',
  lead:     '#F59E0B',
  sale:     '#10B981',
}

const etapaLabel: Record<string, string> = {
  interesado: 'Interesado',
  evaluando:  'Evaluando',
  objecion:   'Objeción',
  documentos: 'Documentos',
  cierre:     'Cierre',
}

const origenLabel: Record<string, string> = {
  salon:      'Salón',
  red_social: 'Red social',
  referido:   'Referido',
  pauta:      'Pauta',
  otro:       'Otro',
}

export default function ClienteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient]               = useState<Client | null>(null)
  const [interactions, setInteractions]   = useState<Interaction[]>([])
  const [tab, setTab]                     = useState<'info'|'historial'>('info')
  const [modalNota, setModalNota]         = useState(false)
  const [modalDescarte, setModalDescarte] = useState(false)
  const [nota, setNota]                   = useState('')
  const [motivoDescarte, setMotivoDescarte] = useState('')
  const [guardando, setGuardando]         = useState(false)
  const [sugerencia, setSugerencia]       = useState<string>('')
  const [mensajeIA, setMensajeIA]         = useState<string>('')
  const [cargandoIA, setCargandoIA]       = useState(false)
  const [iaExpandida, setIaExpandida]     = useState(false)
  const [copiado, setCopiado]             = useState(false)
  const [ultimaAccion, setUltimaAccion]   = useState<{ tipo: string; valorAnterior: any } | null>(null)
  const [subiendoFoto, setSubiendoFoto]   = useState(false)
  const { formatDual } = useTipoCambio()
  const interactionsRef = React.useRef<Interaction[]>([])

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
    const { data: i } = await supabase.from('interactions').select('*').eq('client_id', id).order('created_at', { ascending: false })
    if (i) {
      interactionsRef.current = i
      setInteractions(i)
    }
    if (c) {
      setClient(c)
      cargarSugerencia(c, i || [])
    }
  }

  async function cargarSugerencia(c: Client, historial: any[]) {
    setCargandoIA(true)
    try {
      const res = await generarSugerencia(c.name, c.vehicle_interest, c.temperature, c.contact_count, historial)
      setSugerencia(res.sugerencia)
      setMensajeIA(res.mensaje)
    } catch (e) {
      setSugerencia('No se pudo generar sugerencia.')
      setMensajeIA('')
    } finally {
      setCargandoIA(false)
      setInteractions([...interactionsRef.current])
    }
  }

  async function registrarContacto(type: string, content: string) {
    await supabase.from('interactions').insert({ client_id: id, type, content })
    await supabase.from('clients').update({
      last_contact_at: new Date().toISOString(),
      contact_count: (client?.contact_count || 0) + 1
    }).eq('id', id)
    await cargar()
  }

  async function cambiarTemp(t: string) {
    const tempAnterior = client?.temperature
    setUltimaAccion({ tipo: 'temperatura', valorAnterior: tempAnterior })
    await supabase.from('clients').update({ temperature: t }).eq('id', id)
    await cargar()
    setTimeout(() => setUltimaAccion(null), 5000)
  }

  async function deshacer() {
    if (!ultimaAccion) return
    if (ultimaAccion.tipo === 'temperatura') {
      await supabase.from('clients').update({ temperature: ultimaAccion.valorAnterior }).eq('id', id)
      await cargar()
    }
    setUltimaAccion(null)
  }

  function marcarVendido() {
    Alert.alert(
      '¿Confirmás la venta?',
      'Se va a marcar este cliente como vendido y pasa a Post-venta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar venta',
          onPress: async () => {
            await supabase.from('clients').update({ sold: true, sale_date: new Date().toISOString().split('T')[0] }).eq('id', id)
            await supabase.from('interactions').insert({ client_id: id, type: 'sale', content: 'Venta cerrada' })
            setClient(prev => prev ? { ...prev, sold: true } : prev)
            await cargar()
          },
        },
      ]
    )
  }

  async function descartarCliente() {
    if (!motivoDescarte.trim()) return
    await supabase.from('clients').update({
      temperature: 'cold',
      motivo_descarte: motivoDescarte.trim(),
    }).eq('id', id)
    await supabase.from('interactions').insert({
      client_id: id,
      type: 'note',
      content: `Descartado: ${motivoDescarte.trim()}`
    })
    setModalDescarte(false)
    setMotivoDescarte('')
    await cargar()
  }

  async function guardarNota() {
    if (!nota.trim()) return
    setGuardando(true)
    await supabase.from('interactions').insert({ client_id: id, type: 'note', content: nota.trim() })
    await supabase.from('clients').update({ last_contact_at: new Date().toISOString(), contact_count: (client?.contact_count || 0) + 1 }).eq('id', id)
    setNota(''); setModalNota(false); setGuardando(false)
    await cargar()
  }

  async function subirFotoVehiculo() {
    const asset = await elegirImagen([4, 3])
    if (!asset) return
    setSubiendoFoto(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const url = await subirImagen(asset, 'vehiculos', `${user?.id}/${id}`)
      await supabase.from('clients').update({ vehicle_photo_url: url }).eq('id', id)
      setClient(prev => prev ? { ...prev, vehicle_photo_url: url } : prev)
    } catch (e) {
      console.error(e)
    } finally {
      setSubiendoFoto(false)
    }
  }

  function abrirWhatsApp(mensaje?: string) {
    const phone = client?.phone?.replace(/\D/g, '') || ''
    if (!phone) return
    const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''
    Linking.openURL(`https://wa.me/595${phone}${texto}`)
  }

  function llamar() {
    if (!client?.phone) return
    Linking.openURL(`tel:${client.phone}`)
  }

  function copiarMensaje() {
    {
      Clipboard.setStringAsync(mensajeIA)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  // Explica el estado de la temperatura según días sin contacto (umbrales del pg_cron: 7 y 15)
  function estadoTemperatura(): { texto: string; color: string; icon: string } | null {
    if (!client) return null
    if (client.sold) return null

    const dias = client.last_contact_at
      ? Math.floor((Date.now() - new Date(client.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
      : null

    if (client.temperature === 'hot') {
      if (dias === null) return { texto: 'Aún sin contacto — contactalo para que no se enfríe', color: T.red, icon: 'flame' }
      const restan = 7 - dias
      if (restan <= 0) return { texto: 'Está por bajar a Warm — contactalo hoy', color: T.red, icon: 'alert-circle' }
      if (restan <= 2) return { texto: `Se enfría a Warm en ${restan} día${restan !== 1 ? 's' : ''} si no lo contactás`, color: T.red, icon: 'flame' }
      return { texto: 'Lead caliente — mantené el contacto activo', color: T.red, icon: 'flame' }
    }

    if (client.temperature === 'warm') {
      if (dias === null) return { texto: 'Trabajalo para subirlo a Hot', color: T.warm, icon: 'partly-sunny' }
      const restan = 15 - dias
      if (restan <= 0) return { texto: 'Está por bajar a Cold — no lo dejes ir', color: T.warm, icon: 'alert-circle' }
      if (restan <= 3) return { texto: `Se enfría a Cold en ${restan} día${restan !== 1 ? 's' : ''} sin contacto`, color: T.warm, icon: 'partly-sunny' }
      return { texto: 'Un buen seguimiento puede subirlo a Hot', color: T.warm, icon: 'partly-sunny' }
    }

    return { texto: 'Lead frío — un contacto puede reactivarlo', color: T.blue, icon: 'snow' }
  }
  const estadoTemp = estadoTemperatura()

  if (!client) return (
    <View style={styles.loading}>
      <ActivityIndicator color={T.accent} size="large" />
      <Text style={{ color: T.muted, fontSize: 14, marginTop: 14 }}>Cargando ficha...</Text>
    </View>
  )

  const inactivo = client.sold || !!client.motivo_descarte

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={20} color={NEGRO} />
            <Text style={styles.back}>Volver</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/cliente/editar/${id}`)} style={styles.headerBtn}>
            <Text style={styles.editBtn}>Editar</Text>
            <Ionicons name="create-outline" size={17} color={T.textSub} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: tempDim(client.temperature) }]}>
            <Text style={[styles.avatarText, { color: tempTextColor(client.temperature) }]}>
              {client.name.slice(0,2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{client.name}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: tempDim(client.temperature) }]}>
                <Text style={[styles.badgeText, { color: tempTextColor(client.temperature) }]}>
                  {tempLabel(client.temperature)}
                </Text>
              </View>
              {client.etapa && (
                <View style={[styles.badge, { backgroundColor: T.bg }]}>
                  <Text style={[styles.badgeText, { color: T.textSub }]}>{etapaLabel[client.etapa]}</Text>
                </View>
              )}
              {client.calificacion ? (
                <View style={styles.starsRow}>
                  {[...Array(client.calificacion)].map((_, i) => (
                    <Ionicons key={i} name="star" size={11} color="#F59E0B" />
                  ))}
                </View>
              ) : null}
              {client.motivo_descarte && (
                <View style={[styles.badge, { backgroundColor: T.redDim }]}>
                  <Text style={[styles.badgeText, { color: T.red }]}>Descartado</Text>
                </View>
              )}
              {client.docs_received && (
                <View style={styles.inlineRow}>
                  <Ionicons name="checkmark-circle" size={12} color={T.green} />
                  <Text style={styles.docsTag}>Docs</Text>
                </View>
              )}
              {client.sold && (
                <View style={styles.inlineRow}>
                  <Ionicons name="trophy" size={12} color={T.green} />
                  <Text style={styles.soldTag}>Vendido</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {estadoTemp && (
          <View style={[styles.tempHint, { backgroundColor: estadoTemp.color + '14' }]}>
            <Ionicons name={estadoTemp.icon as any} size={15} color={estadoTemp.color} />
            <Text style={[styles.tempHintText, { color: estadoTemp.color }]}>{estadoTemp.texto}</Text>
          </View>
        )}

        {client.vehicle_photo_url ? (
          <TouchableOpacity onPress={subirFotoVehiculo} style={styles.fotoVehiculoContainer} activeOpacity={0.9}>
            <Image source={{ uri: client.vehicle_photo_url }} style={styles.fotoVehiculo} resizeMode="cover" />
            <View style={styles.fotoVehiculoEdit}>
              <Ionicons name={subiendoFoto ? 'hourglass-outline' : 'camera'} size={13} color="#fff" />
              <Text style={styles.fotoEditText}>{subiendoFoto ? 'Subiendo...' : 'Cambiar foto'}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.fotoVehiculoVacia} onPress={subirFotoVehiculo} activeOpacity={0.7}>
            <Ionicons name={subiendoFoto ? 'hourglass-outline' : 'car-sport-outline'} size={22} color={T.muted} />
            <Text style={styles.fotoVaciaText}>
              {subiendoFoto ? 'Subiendo...' : 'Agregar foto del vehículo'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {ultimaAccion && (
        <View style={styles.undoBar}>
          <View style={styles.inlineRow}>
            <Ionicons name="checkmark-circle" size={15} color="#fff" />
            <Text style={styles.undoText}>Temperatura actualizada</Text>
          </View>
          <TouchableOpacity onPress={deshacer}>
            <Text style={styles.undoBtn}>Deshacer</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.iaStrip} onPress={() => setIaExpandida(!iaExpandida)} activeOpacity={0.85}>
        <View style={styles.iaHeader}>
          <View style={styles.inlineRow}>
            <Ionicons name="sparkles" size={14} color={T.accentText} />
            <Text style={styles.iaTitle}>SUGERENCIA IA</Text>
          </View>
          {cargandoIA ? (
            <Text style={styles.iaToggle}>Analizando...</Text>
          ) : (
            <Ionicons name={iaExpandida ? 'chevron-up' : 'chevron-down'} size={17} color={T.accentText} />
          )}
        </View>
        {iaExpandida && !cargandoIA && (
          <>
            <Text style={styles.iaText}>{sugerencia}</Text>
            {mensajeIA ? (
              <>
                <View style={styles.iaDivider} />
                <Text style={styles.iaMensajeLabel}>MENSAJE LISTO PARA WHATSAPP</Text>
                <Text style={styles.iaMensaje}>{mensajeIA}</Text>
                <View style={styles.iaBtnRow}>
                  <TouchableOpacity style={styles.iaWaBtn} onPress={() => abrirWhatsApp(mensajeIA)} activeOpacity={0.85}>
                    <Ionicons name="logo-whatsapp" size={15} color="#fff" />
                    <Text style={styles.iaWaText}>Enviar por WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iaCopyBtnSm} onPress={copiarMensaje} activeOpacity={0.8}>
                    <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={15} color={copiado ? '#10B981' : T.textSub} />
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </>
        )}
      </TouchableOpacity>

      <View style={styles.quickActions}>
        {[
          { icon:'call',                label:'Llamé',      color:T.green,   onPress: () => registrarContacto('call', 'Llamada realizada') },
          { icon:'logo-whatsapp',       label:'WA enviado', color:'#25D366', onPress: () => registrarContacto('whatsapp', 'WhatsApp enviado') },
          { icon:'close-circle',        label:'No atendió', color:T.red,     onPress: () => registrarContacto('call', 'Llamada — no contestó') },
          { icon:'create',              label:'Nota',       color:'#4A8AE8', onPress: () => setModalNota(true) },
        ].map(a => (
          <TouchableOpacity key={a.label} style={styles.qaBtn} onPress={a.onPress} activeOpacity={0.7}>
            <View style={[styles.qaIconWrap, { backgroundColor: a.color + '18' }]}>
              <Ionicons name={a.icon as any} size={17} color={a.color} />
            </View>
            <Text style={styles.qaLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.secondActions}>
        <TouchableOpacity style={styles.secBtn} onPress={() => abrirWhatsApp()} activeOpacity={0.7}>
          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
          <Text style={[styles.secBtnText, { color: '#25D366' }]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secBtn} onPress={llamar} activeOpacity={0.7}>
          <Ionicons name="call" size={14} color={T.green} />
          <Text style={[styles.secBtnText, { color: T.green }]}>Llamar</Text>
        </TouchableOpacity>
        {!inactivo && (
          <TouchableOpacity style={[styles.secBtn, styles.secBtnDark]} onPress={marcarVendido} activeOpacity={0.85}>
            <Ionicons name="trophy" size={14} color="#fff" />
            <Text style={[styles.secBtnText, { color: '#fff' }]}>Vendido</Text>
          </TouchableOpacity>
        )}
        {!inactivo && (
          <TouchableOpacity style={styles.secBtn} onPress={() => setModalDescarte(true)} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={14} color={T.red} />
            <Text style={[styles.secBtnText, { color: T.red }]}>Descartar</Text>
          </TouchableOpacity>
        )}
        {client.motivo_descarte && (
          <View style={[styles.secBtn, { backgroundColor: T.redDim, borderColor: T.red + '44' }]}>
            <Ionicons name="close-circle" size={14} color={T.red} />
            <Text style={[styles.secBtnText, { color: T.red }]}>Descartado</Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        {(['info','historial'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, { color: tab === t ? NEGRO : T.muted }]}>
              {t === 'info' ? 'Info' : 'Historial'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
        {tab === 'info' && (
          <>
            <View style={styles.infoCard}>
              {[
                { label: 'Teléfono',          value: client.phone },
                { label: 'Vehículo',          value: client.vehicle_interest },
                { label: 'Presupuesto',       value: formatDual(client.budget), accent: true },
                { label: 'Trabajo',           value: client.job },
                { label: 'Cumpleaños',        value: client.birthday },
                { label: 'Club',              value: client.club },
                { label: 'Etapa',             value: client.etapa ? etapaLabel[client.etapa] : null },
                { label: 'Origen',            value: client.origen ? origenLabel[client.origen] : null },
                { label: 'Comentario clave',  value: client.comentario_clave },
                { label: 'Motivo descarte',   value: client.motivo_descarte },
                { label: 'Notas',             value: client.notes },
                { label: 'Contactos',         value: `${client.contact_count} realizados` },
              ].filter(r => r.value).map((r, i, arr) => (
                <View key={r.label} style={[styles.infoRow, i === arr.length-1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={[styles.infoValue, r.accent && { color: T.accentText, fontWeight: '700' }]}>{r.value}</Text>
                </View>
              ))}
            </View>

            {!inactivo && (
              <>
                <Text style={styles.sectionLabel}>CALIFICACIÓN DEL LEAD</Text>
                <View style={styles.starsBox}>
                  {[1, 2, 3, 4, 5].map(n => {
                    const activa = (client.calificacion || 0) >= n
                    return (
                      <TouchableOpacity
                        key={n}
                        onPress={async () => {
                          await supabase.from('clients').update({ calificacion: n }).eq('id', id)
                          setClient(prev => prev ? { ...prev, calificacion: n } : prev)
                        }}
                        style={styles.starBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={activa ? 'star' : 'star-outline'}
                          size={26}
                          color={activa ? '#F59E0B' : T.border}
                        />
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <Text style={styles.sectionLabel}>TEMPERATURA</Text>
                <View style={styles.tempRow}>
                  {(['hot','warm','cold'] as const).map(t => {
                    const act = client.temperature === t
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => cambiarTemp(t)}
                        activeOpacity={0.8}
                        style={[styles.tempBtn, {
                          backgroundColor: act ? tempColor(t) : T.white,
                          borderColor: act ? tempColor(t) : T.border,
                        }]}
                      >
                        <View style={[styles.dot, { backgroundColor: act ? '#fff' : tempColor(t) }]} />
                        <Text style={[styles.tempBtnText, { color: act ? '#fff' : T.textSub }]}>
                          {tempLabel(t)}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </>
            )}
          </>
        )}

        {tab === 'historial' && (
          <>
            {interactions.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="time-outline" size={36} color={T.muted} />
                <Text style={styles.emptyText}>Sin interacciones todavía</Text>
                <Text style={styles.emptySub}>Usá los botones de arriba para registrar contacto</Text>
              </View>
            ) : interactions.map(i => (
              <View key={i.id} style={styles.interactionCard}>
                <View style={[styles.interactionIconWrap, { backgroundColor: (INTERACTION_COLOR[i.type] || T.muted) + '18' }]}>
                  <Ionicons
                    name={INTERACTION_ICON[i.type] || 'document-text'}
                    size={16}
                    color={INTERACTION_COLOR[i.type] || T.muted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.interactionContent}>{i.content}</Text>
                  <Text style={styles.interactionDate}>{new Date(i.created_at).toLocaleString('es-PY')}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={modalNota} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitulo}>Agregar nota</Text>
            <TextInput
              style={styles.notaInput}
              placeholder="¿Qué pasó en este contacto?"
              placeholderTextColor={T.muted}
              value={nota}
              onChangeText={setNota}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalNota(false)}>
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarNota} disabled={guardando}>
                <Text style={styles.btnGuardarText}>{guardando ? 'Guardando...' : 'Guardar nota'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalDescarte} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitulo}>¿Por qué descartás este lead?</Text>
              <View style={{ gap: 8, marginTop: 14, marginBottom: 14 }}>
                {[
                  'No califica para crédito',
                  'Compró en otra concesionaria',
                  'No tiene presupuesto',
                  'Ya no está interesado',
                  'No responde',
                  'Otro motivo',
                ].map(m => {
                  const sel = motivoDescarte === m
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.motivoBtn, sel && { backgroundColor: T.redDim, borderColor: T.red }]}
                      onPress={() => setMotivoDescarte(m)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={sel ? 'radio-button-on' : 'radio-button-off'}
                        size={17}
                        color={sel ? T.red : T.border}
                      />
                      <Text style={{ color: sel ? T.red : T.textSub, fontWeight: '600', fontSize: 13 }}>{m}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              <TextInput
                style={styles.notaInput}
                placeholder="O escribí tu propio motivo..."
                placeholderTextColor={T.muted}
                value={motivoDescarte}
                onChangeText={setMotivoDescarte}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => { setModalDescarte(false); setMotivoDescarte('') }}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnGuardar, { backgroundColor: T.red }, !motivoDescarte.trim() && { opacity: 0.4 }]}
                  onPress={descartarCliente}
                  disabled={!motivoDescarte.trim()}
                >
                  <Text style={styles.btnGuardarText}>Descartar lead</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: T.bg },
  loading:               { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  inlineRow:             { flexDirection: 'row', alignItems: 'center', gap: 5 },

  header:                { backgroundColor: T.white, borderBottomWidth: 0.5, borderBottomColor: T.border },
  headerTop:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10 },
  headerBtn:             { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4 },
  back:                  { color: NEGRO, fontSize: 15, fontWeight: '600' },
  editBtn:               { color: T.textSub, fontSize: 13.5, fontWeight: '600' },

  profileRow:            { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 20, paddingBottom: 14 },
  avatar:                { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText:            { fontSize: 18, fontWeight: '800' },
  clientName:            { color: NEGRO, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  tempHint:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, marginBottom: 14 },
  tempHintText:  { fontSize: 12.5, fontWeight: '600', flex: 1 },
  badgeRow:              { flexDirection: 'row', gap: 7, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' },
  badge:                 { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:             { fontSize: 10.5, fontWeight: '700' },
  starsRow:              { flexDirection: 'row', gap: 1 },
  docsTag:               { color: T.green, fontSize: 10.5, fontWeight: '700' },
  soldTag:               { color: T.green, fontSize: 10.5, fontWeight: '700' },

  fotoVehiculoContainer: { height: 165, overflow: 'hidden' },
  fotoVehiculo:          { width: '100%', height: 165 },
  fotoVehiculoEdit:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  fotoEditText:          { fontSize: 12, color: '#fff', fontWeight: '700' },
  fotoVehiculoVacia:     { height: 74, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: T.bg, borderTopWidth: 0.5, borderTopColor: T.border },
  fotoVaciaText:         { color: T.muted, fontSize: 12, fontWeight: '600' },

  undoBar:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: NEGRO, paddingHorizontal: 16, paddingVertical: 11, marginHorizontal: 14, marginTop: 12, borderRadius: 12 },
  undoText:              { color: '#fff', fontSize: 12.5, fontWeight: '500' },
  undoBtn:               { color: T.accent, fontSize: 12.5, fontWeight: '800' },

  iaStrip:               { marginHorizontal: 14, marginTop: 12, marginBottom: 4, backgroundColor: T.accentDim, borderRadius: 14, padding: 13, borderWidth: 0.5, borderColor: T.accent + '55' },
  iaHeader:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iaTitle:               { color: T.accentText, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  iaToggle:              { color: T.accentText, fontSize: 11, fontWeight: '700' },
  iaText:                { color: T.accentText, fontSize: 13, lineHeight: 20, marginTop: 10 },
  iaDivider:             { height: 0.5, backgroundColor: T.accent + '44', marginVertical: 11 },
  iaMensajeLabel:        { color: T.accentText, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  iaMensaje:             { color: T.accentDark, fontSize: 12.5, lineHeight: 20, fontStyle: 'italic' },
  iaBtnRow:      { flexDirection: 'row', gap: 8, marginTop: 12 },
  iaWaBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#25D366', borderRadius: 11, paddingVertical: 12 },
  iaWaText:      { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  iaCopyBtnSm:   { width: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg, borderRadius: 11, borderWidth: 0.5, borderColor: T.border },
  iaCopyBtn:             { backgroundColor: NEGRO, borderRadius: 10, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 11 },
  iaCopyText:            { color: '#fff', fontSize: 12.5, fontWeight: '800' },

  quickActions:          { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 8 },
  qaBtn:                 { flex: 1, alignItems: 'center', gap: 5 },
  qaIconWrap:            { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel:               { fontSize: 10, fontWeight: '600', color: T.textSub },

  secondActions:         { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12, gap: 6, borderBottomWidth: 0.5, borderBottomColor: T.border, flexWrap: 'wrap' },
  secBtn:                { flex: 1, flexDirection: 'row', backgroundColor: T.white, borderRadius: 11, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 0.5, borderColor: T.border, minWidth: 82 },
  secBtnDark:            { backgroundColor: NEGRO, borderColor: NEGRO },
  secBtnText:            { fontSize: 11, fontWeight: '700' },

  tabs:                  { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: T.border, backgroundColor: T.white },
  tabBtn:                { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabBtnActive:          { borderBottomWidth: 2, borderBottomColor: NEGRO },
  tabText:               { fontSize: 13.5, fontWeight: '600' },

  scroll:                { flex: 1 },
  infoCard:              { backgroundColor: T.white, borderRadius: 16, padding: 15, marginBottom: 18, borderWidth: 0.5, borderColor: T.border },
  infoRow:               { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: T.border },
  infoLabel:             { color: T.muted, fontSize: 12 },
  infoValue:             { color: NEGRO, fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  sectionLabel:          { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 11 },
  starsBox:              { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: T.white, borderRadius: 16, paddingVertical: 14, marginBottom: 20, borderWidth: 0.5, borderColor: T.border },
  starBtn:               { padding: 4 },

  tempRow:               { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tempBtn:               { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  tempBtnText:           { fontSize: 12.5, fontWeight: '700' },
  dot:                   { width: 8, height: 8, borderRadius: 4 },

  interactionCard:       { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: T.white, borderRadius: 14, padding: 13, marginBottom: 8, borderWidth: 0.5, borderColor: T.border },
  interactionIconWrap:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  interactionContent:    { color: NEGRO, fontSize: 13, fontWeight: '500' },
  interactionDate:       { color: T.muted, fontSize: 11, marginTop: 3 },

  empty:                 { alignItems: 'center', marginTop: 50, gap: 8 },
  emptyText:             { color: NEGRO, fontSize: 14.5, fontWeight: '700' },
  emptySub:              { color: T.muted, fontSize: 12, textAlign: 'center' },

  modalOverlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:             { backgroundColor: T.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingTop: 12, paddingBottom: 40 },
  modalHandle:           { width: 38, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 18 },
  modalTitulo:           { color: NEGRO, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 4 },
  motivoBtn:             { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 13, borderRadius: 12, borderWidth: 1, backgroundColor: T.bg, borderColor: T.border },
  notaInput:             { backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: NEGRO, fontSize: 14, borderWidth: 0.5, borderColor: T.border, minHeight: 84, textAlignVertical: 'top', marginTop: 12 },
  modalBtns:             { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnCancelar:           { flex: 1, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: T.bg, borderWidth: 0.5, borderColor: T.border },
  btnCancelarText:       { color: T.textSub, fontWeight: '700', fontSize: 14 },
  btnGuardar:            { flex: 1.4, padding: 15, borderRadius: 14, alignItems: 'center', backgroundColor: NEGRO },
  btnGuardarText:        { color: '#fff', fontWeight: '800', fontSize: 14 },
})
