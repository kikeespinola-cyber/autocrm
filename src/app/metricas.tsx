import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Client } from '../lib/types'
import { getClients } from '../lib/clientesService'
import { T } from '../lib/theme'
import Tooltip from '../components/Tooltip'
import { tooltipVisto, marcarTooltipVisto } from '../lib/tooltips'

const NEGRO = '#1A1A2E'

export default function MetricasScreen() {
  const router = useRouter()
  const [clients, setClients]               = useState<Client[]>([])
  const [mostrarTooltip, setMostrarTooltip] = useState(false)

  useFocusEffect(
    React.useCallback(() => {
      cargar()
      tooltipVisto('metricas').then(visto => {
        if (!visto) setMostrarTooltip(true)
      })
    }, [])
  )

  async function cargar() {
    try {
      const data = await getClients()
      setClients(data)
    } catch (e) {
      console.error(e)
    }
  }

  const total      = clients.length
  const hot        = clients.filter(c => c.temperature === 'hot'  && !c.sold).length
  const warm       = clients.filter(c => c.temperature === 'warm' && !c.sold).length
  const cold       = clients.filter(c => c.temperature === 'cold' && !c.sold).length
  const vendidos   = clients.filter(c => c.sold).length
  const tasaCierre = total > 0 ? Math.round((vendidos / total) * 100) : 0
  const conDocs    = clients.filter(c => c.docs_received).length
  const pctDocs    = total > 0 ? Math.round((conDocs / total) * 100) : 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.titulo}>Métricas</Text>
      <Text style={styles.sub}>Tu rendimiento de ventas</Text>

      <View style={styles.mainCard}>
        <View style={styles.mainTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainNum}>{tasaCierre}<Text style={styles.mainPct}>%</Text></Text>
            <Text style={styles.mainLabel}>Tasa de cierre</Text>
          </View>
          <View style={styles.mainIcon}>
            <Ionicons name="trending-up" size={22} color={NEGRO} />
          </View>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${tasaCierre}%` as any }]} />
        </View>
        <Text style={styles.mainSub}>{vendidos} vendido{vendidos !== 1 ? 's' : ''} de {total} totales</Text>
      </View>

      <Text style={styles.sectionLabel}>EMBUDO</Text>
      <View style={styles.grid}>
        {[
          { num: hot,      label: 'Hot',      color: T.red,   icon: 'flame',              filter: 'hot' },
          { num: warm,     label: 'Warm',     color: T.warm,  icon: 'partly-sunny',       filter: 'warm' },
          { num: cold,     label: 'Cold',     color: T.blue,  icon: 'snow',               filter: 'cold' },
          { num: vendidos, label: 'Cerrados', color: T.green, icon: 'trophy',             filter: 'sold' },
        ].map(s => (
          <TouchableOpacity
            key={s.label}
            style={styles.gridCard}
            onPress={() => router.push(`/pipeline?filter=${s.filter}`)}
            activeOpacity={0.75}
          >
            <View style={styles.gridTop}>
              <View style={[styles.gridIcon, { backgroundColor: s.color + '18' }]}>
                <Ionicons name={s.icon as any} size={17} color={s.color} />
              </View>
              <Ionicons name="chevron-forward" size={15} color={T.muted} />
            </View>
            <Text style={[styles.gridNum, { color: s.color }]}>{s.num}</Text>
            <Text style={styles.gridLabel}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>DOCUMENTACIÓN</Text>
      <View style={styles.docsCard}>
        <TouchableOpacity
          style={styles.docsRow}
          onPress={() => router.push('/clientes?filter=docs')}
          activeOpacity={0.7}
        >
          <View style={styles.inlineRow}>
            <Ionicons name="document-text" size={15} color={T.green} />
            <Text style={styles.docsLabel}>Con documentos</Text>
          </View>
          <View style={styles.inlineRow}>
            <Text style={styles.docsNum}>{conDocs}</Text>
            <Ionicons name="chevron-forward" size={15} color={T.muted} />
          </View>
        </TouchableOpacity>

        <View style={[styles.docsRow, { borderBottomWidth: 0 }]}>
          <View style={styles.inlineRow}>
            <Ionicons name="hourglass-outline" size={15} color={T.muted} />
            <Text style={styles.docsLabel}>Sin documentos</Text>
          </View>
          <Text style={styles.docsNum}>{total - conDocs}</Text>
        </View>

        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pctDocs}%` as any, backgroundColor: T.green }]} />
        </View>
        <Text style={styles.docsPct}>{pctDocs}% de tus clientes ya entregó documentación</Text>
      </View>

      <TouchableOpacity style={styles.tipCard} onPress={() => router.push('/')} activeOpacity={0.8}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb" size={16} color={T.accentText} />
          <Text style={styles.tipTitle}>Foco de hoy</Text>
        </View>
        <Text style={styles.tipText}>
          {hot > 0
            ? `Tenés ${hot} cliente${hot > 1 ? 's' : ''} Hot. Priorizalos — son los más cercanos al cierre.`
            : warm > 0
            ? `Sin clientes Hot hoy. Trabajá los ${warm} Warm para subirlos de temperatura.`
            : 'Sin clientes activos. Agregá nuevos prospectos para arrancar el embudo.'}
        </Text>
        <View style={styles.tipFooter}>
          <Text style={styles.tipArrow}>Ver Tu día</Text>
          <Ionicons name="arrow-forward" size={13} color={T.accentText} />
        </View>
      </TouchableOpacity>

      <Tooltip
        visible={mostrarTooltip}
        titulo="Métricas"
        descripcion="Tu rendimiento en tiempo real. Tocá cualquier número del embudo para ir directo a esos clientes en Pipeline. El foco del día te dice qué priorizar."
        onCerrar={() => { setMostrarTooltip(false); marcarTooltipVisto('metricas') }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: T.bg },
  content:      { padding: 20, paddingTop: 24, paddingBottom: 60 },
  inlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 7 },

  titulo:       { color: NEGRO, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  sub:          { color: T.muted, fontSize: 13, marginTop: 3, marginBottom: 20, fontWeight: '500' },

  mainCard:     { backgroundColor: T.white, borderRadius: 18, padding: 20, marginBottom: 24, borderWidth: 0.5, borderColor: T.border },
  mainTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  mainNum:      { color: NEGRO, fontSize: 50, fontWeight: '800', letterSpacing: -2.5, lineHeight: 54 },
  mainPct:      { fontSize: 26, fontWeight: '700', color: T.muted },
  mainLabel:    { color: T.textSub, fontSize: 15, fontWeight: '600', marginTop: 2 },
  mainIcon:     { width: 44, height: 44, borderRadius: 14, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  mainSub:      { color: T.muted, fontSize: 12, marginTop: 10 },

  barBg:        { height: 7, backgroundColor: T.bg, borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: 7, backgroundColor: NEGRO, borderRadius: 4 },

  sectionLabel: { color: T.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 11 },

  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  gridCard:     { width: '48.5%', backgroundColor: T.white, borderRadius: 16, padding: 15, borderWidth: 0.5, borderColor: T.border },
  gridTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  gridIcon:     { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  gridNum:      { fontSize: 30, fontWeight: '800', letterSpacing: -1.2 },
  gridLabel:    { color: T.textSub, fontSize: 12.5, fontWeight: '600', marginTop: 2 },

  docsCard:     { backgroundColor: T.white, borderRadius: 16, padding: 16, marginBottom: 22, borderWidth: 0.5, borderColor: T.border },
  docsRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: T.border },
  docsLabel:    { color: T.textSub, fontSize: 13 },
  docsNum:      { color: NEGRO, fontSize: 14, fontWeight: '800' },
  docsPct:      { color: T.muted, fontSize: 11.5, marginTop: 9 },

  tipCard:      { backgroundColor: T.accentDim, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: T.accent + '44' },
  tipHeader:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  tipTitle:     { color: T.accentText, fontSize: 13.5, fontWeight: '800' },
  tipText:      { color: T.accentText, fontSize: 13, lineHeight: 20 },
  tipFooter:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  tipArrow:     { color: T.accentText, fontSize: 12, fontWeight: '700' },
})
