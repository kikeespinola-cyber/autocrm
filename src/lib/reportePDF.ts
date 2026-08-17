import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { Client } from './types'

const ACCENT = '#04dedf'
const NEGRO  = '#1A1A2E'

export async function generarReportePDF(clients: Client[], userName: string, userEmail: string) {
  const hoy = new Date()
  const mesNombre = hoy.toLocaleString('es-PY', { month: 'long', year: 'numeric' })

  const vendidos   = clients.filter(c => c.sold)
  const activos    = clients.filter(c => !c.sold)
  const hot        = activos.filter(c => c.temperature === 'hot').length
  const warm       = activos.filter(c => c.temperature === 'warm').length
  const cold       = activos.filter(c => c.temperature === 'cold').length
  const tasa       = clients.length > 0 ? Math.round((vendidos.length / clients.length) * 100) : 0
  const conDocs    = clients.filter(c => c.docs_received).length
  const referidos  = clients.filter(c => c.origen === 'referido').length

  const tiempos = vendidos
    .filter(c => c.sale_date && c.created_at)
    .map(c => Math.floor((new Date(c.sale_date!).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)))
  const promedioDias = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0

  const filasVendidos = vendidos.length > 0
    ? vendidos.map(c => `
        <tr>
          <td>${escapar(c.name)}</td>
          <td>${escapar(c.vehicle_interest || '—')}</td>
          <td>${c.sale_date ? new Date(c.sale_date).toLocaleDateString('es-PY') : '—'}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="text-align:center;color:#9CA3AF;">Sin ventas cerradas este mes</td></tr>`

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
      body { padding: 40px; color: ${NEGRO}; }
      .header { display: flex; align-items: center; gap: 12px; padding-bottom: 20px; border-bottom: 3px solid ${ACCENT}; margin-bottom: 24px; }
      .logo { width: 44px; height: 44px; border-radius: 11px; background: ${ACCENT}; color: #fff; font-size: 24px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
      .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
      .brand-sub { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
      .vendedor-card { background: #F5F7F8; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
      .vendedor-nombre { font-size: 18px; font-weight: 700; }
      .vendedor-email { font-size: 13px; color: #6B7280; margin-top: 3px; }
      .periodo { font-size: 13px; color: ${ACCENT}; font-weight: 600; margin-top: 6px; text-transform: capitalize; }
      .section-title { font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #9CA3AF; text-transform: uppercase; margin: 26px 0 12px; }
      .stats-grid { display: flex; flex-wrap: wrap; gap: 12px; }
      .stat-box { flex: 1; min-width: 120px; background: #fff; border: 1px solid #E8ECEF; border-radius: 12px; padding: 16px; }
      .stat-num { font-size: 30px; font-weight: 800; letter-spacing: -1px; }
      .stat-label { font-size: 12px; color: #6B7280; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9CA3AF; padding: 10px 12px; border-bottom: 2px solid #E8ECEF; }
      td { font-size: 13px; padding: 11px 12px; border-bottom: 1px solid #F0F2F4; }
      .funnel { display: flex; gap: 10px; }
      .funnel-item { flex: 1; border-radius: 12px; padding: 14px; text-align: center; color: #fff; }
      .funnel-num { font-size: 26px; font-weight: 800; }
      .funnel-label { font-size: 12px; margin-top: 2px; opacity: 0.9; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E8ECEF; text-align: center; font-size: 11px; color: #9CA3AF; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="logo">V</div>
      <div>
        <div class="brand">Vendix</div>
        <div class="brand-sub">Reporte de cierre de mes</div>
      </div>
    </div>

    <div class="vendedor-card">
      <div class="vendedor-nombre">${escapar(userName)}</div>
      <div class="vendedor-email">${escapar(userEmail)}</div>
      <div class="periodo">${mesNombre}</div>
    </div>

    <div class="section-title">Resumen del mes</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-num" style="color:${NEGRO};">${clients.length}</div>
        <div class="stat-label">Total de clientes</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color:#10B981;">${vendidos.length}</div>
        <div class="stat-label">Ventas cerradas</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color:${ACCENT};">${tasa}%</div>
        <div class="stat-label">Tasa de cierre</div>
      </div>
    </div>

    <div class="section-title">Embudo actual</div>
    <div class="funnel">
      <div class="funnel-item" style="background:#EF4444;">
        <div class="funnel-num">${hot}</div>
        <div class="funnel-label">Hot</div>
      </div>
      <div class="funnel-item" style="background:#F59E0B;">
        <div class="funnel-num">${warm}</div>
        <div class="funnel-label">Warm</div>
      </div>
      <div class="funnel-item" style="background:#4A8AE8;">
        <div class="funnel-num">${cold}</div>
        <div class="funnel-label">Cold</div>
      </div>
    </div>

    <div class="section-title">Indicadores</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-num" style="color:${NEGRO};font-size:22px;">${promedioDias > 0 ? promedioDias + ' días' : '—'}</div>
        <div class="stat-label">Tiempo promedio de cierre</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color:${NEGRO};font-size:22px;">${conDocs}</div>
        <div class="stat-label">Con documentación</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color:#8B5CF6;font-size:22px;">${referidos}</div>
        <div class="stat-label">Referidos</div>
      </div>
    </div>

    <div class="section-title">Ventas cerradas</div>
    <table>
      <thead>
        <tr><th>Cliente</th><th>Vehículo</th><th>Fecha</th></tr>
      </thead>
      <tbody>
        ${filasVendidos}
      </tbody>
    </table>

    <div class="footer">
      Generado por Vendix · Vendé con inteligencia · ${hoy.toLocaleDateString('es-PY')}
    </div>
  </body>
  </html>`

  // Genera el PDF a un archivo temporal
  const { uri } = await Print.printToFileAsync({ html, base64: false })

  // Comparte el PDF (WhatsApp, email, guardar, etc.)
  const disponible = await Sharing.isAvailableAsync()
  if (disponible) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir reporte',
      UTI: 'com.adobe.pdf',
    })
  }
  return uri
}

// Escapa caracteres especiales de HTML para evitar romper el markup
function escapar(texto: string): string {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
