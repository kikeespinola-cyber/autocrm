import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { Client } from './types'
import { APP_NAME } from './marca'

const ACCENT = '#04dedf'
const NEGRO  = '#1A1A2E'

function escaparHTML(t: string): string {
  return String(t || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function tempLabel(t: string): string {
  if (t === 'hot') return 'Hot'
  if (t === 'warm') return 'Warm'
  if (t === 'cold') return 'Cold'
  return t || '—'
}

function origenLabel(o: string | null): string {
  const map: Record<string, string> = {
    salon: 'Salón', red_social: 'Red social', referido: 'Referido', pauta: 'Pauta', otro: 'Otro',
  }
  return o ? (map[o] || o) : '—'
}

// ---- Exportar a CSV ----
export async function exportarClientesCSV(clients: Client[], nombreVendedor: string) {
  const cols = ['Nombre', 'Teléfono', 'Vehículo de interés', 'Temperatura', 'Estado', 'Origen', 'Documentos', 'Fecha de venta']

  const filas = clients.map(c => [
    c.name || '',
    c.phone || '',
    c.vehicle_interest || '',
    tempLabel(c.temperature),
    c.sold ? 'Vendido' : 'Activo',
    origenLabel(c.origen),
    c.docs_received ? 'Sí' : 'No',
    c.sale_date || '',
  ])

  // Escapar campos con comas o comillas
  const escaparCampo = (v: string) => {
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const bom = '\uFEFF' // para que Excel abra bien los acentos
  const contenido = bom +
    cols.join(',') + '\n' +
    filas.map(f => f.map(escaparCampo).join(',')).join('\n')

  const fecha = new Date().toISOString().split('T')[0]
  const uri = FileSystem.cacheDirectory + `clientes-vento-${fecha}.csv`
  await FileSystem.writeAsStringAsync(uri, contenido, { encoding: FileSystem.EncodingType.UTF8 })

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar clientes (CSV)',
      UTI: 'public.comma-separated-values-text',
    })
  }
  return uri
}

// ---- Exportar a PDF ----
export async function exportarClientesPDF(clients: Client[], nombreVendedor: string) {
  const hoy = new Date()
  const activos  = clients.filter(c => !c.sold)
  const vendidos = clients.filter(c => c.sold)

  const filas = clients.map(c => `
    <tr>
      <td>${escaparHTML(c.name)}</td>
      <td>${escaparHTML(c.phone || '—')}</td>
      <td>${escaparHTML(c.vehicle_interest || '—')}</td>
      <td><span class="temp temp-${c.temperature}">${tempLabel(c.temperature)}</span></td>
      <td>${c.sold ? '<span class="vendido">Vendido</span>' : 'Activo'}</td>
    </tr>`).join('')

  const html = `
  <!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; }
    body { padding:40px; color:${NEGRO}; }
    .header { display:flex; align-items:center; gap:12px; padding-bottom:20px; border-bottom:3px solid ${ACCENT}; margin-bottom:20px; }
    .logo { width:44px; height:44px; border-radius:11px; background:${ACCENT}; color:#fff; font-size:24px; font-weight:900; display:flex; align-items:center; justify-content:center; }
    .brand { font-size:22px; font-weight:800; }
    .brand-sub { font-size:12px; color:#9CA3AF; margin-top:2px; }
    .meta { font-size:13px; color:#6B7280; margin-bottom:20px; }
    .meta strong { color:${NEGRO}; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#9CA3AF; padding:10px; border-bottom:2px solid #E8ECEF; }
    td { font-size:12.5px; padding:10px; border-bottom:1px solid #F0F2F4; }
    .temp { padding:3px 9px; border-radius:10px; font-size:11px; font-weight:700; }
    .temp-hot { background:#FEE2E2; color:#DC2626; }
    .temp-warm { background:#FEF3C7; color:#D97706; }
    .temp-cold { background:#DBEAFE; color:#2563EB; }
    .vendido { color:#059669; font-weight:700; }
    .footer { margin-top:30px; padding-top:16px; border-top:1px solid #E8ECEF; text-align:center; font-size:11px; color:#9CA3AF; }
  </style></head><body>
    <div class="header">
      <div class="logo">V</div>
      <div><div class="brand">${APP_NAME}</div><div class="brand-sub">Cartera de clientes</div></div>
    </div>
    <div class="meta">
      <strong>${escaparHTML(nombreVendedor)}</strong> · ${clients.length} clientes
      (${activos.length} activos, ${vendidos.length} vendidos) · ${hoy.toLocaleDateString('es-PY')}
    </div>
    <table>
      <thead><tr><th>Nombre</th><th>Teléfono</th><th>Vehículo</th><th>Temp.</th><th>Estado</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="5" style="text-align:center;color:#9CA3AF;">Sin clientes cargados</td></tr>'}</tbody>
    </table>
    <div class="footer">Generado por ${APP_NAME} · Vendé con inteligencia · ${hoy.toLocaleDateString('es-PY')}</div>
  </body></html>`

  const { uri } = await Print.printToFileAsync({ html, base64: false })
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Exportar clientes (PDF)',
      UTI: 'com.adobe.pdf',
    })
  }
  return uri
}
