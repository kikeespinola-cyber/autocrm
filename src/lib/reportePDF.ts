import { Client } from './types'

export async function generarReportePDF(
  clients: Client[],
  userName: string,
  userEmail: string
) {
  if (typeof window === 'undefined') return

  const mes  = new Date().toLocaleString('es-PY', { month: 'long', year: 'numeric' })
  const hoy  = new Date().toLocaleDateString('es-PY')

  const vendidos   = clients.filter(c => c.sold)
  const activos    = clients.filter(c => !c.sold)
  const hot        = activos.filter(c => c.temperature === 'hot').length
  const warm       = activos.filter(c => c.temperature === 'warm').length
  const cold       = activos.filter(c => c.temperature === 'cold').length
  const conDocs    = clients.filter(c => c.docs_received && !c.sold).length
  const tasa       = clients.length > 0 ? Math.round((vendidos.length / clients.length) * 100) : 0
  const tiempos    = vendidos.filter(c => c.sale_date && c.created_at).map(c =>
    Math.floor((new Date(c.sale_date!).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
  )
  const promedio   = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0
  const docsListos = activos.filter(c => c.docs_received)

  function diasSinContacto(c: Client): number {
    const ref = c.last_contact_at || c.created_at
    return Math.floor((new Date().getTime() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24))
  }

  function estadoColor(c: Client): string {
    if (c.sold) return '#10B981'
    if (c.temperature === 'hot')  return '#EF4444'
    if (c.temperature === 'warm') return '#F59E0B'
    return '#3B82F6'
  }

  function estadoLabel(c: Client): string {
    if (c.sold) return '✅ Cerrado'
    if (c.temperature === 'hot')  return '🔴 Hot'
    if (c.temperature === 'warm') return '🟡 Warm'
    return '🔵 Cold'
  }

  function diasColor(dias: number, c: Client): string {
    if (c.sold) return '#10B981'
    if (dias >= 15) return '#EF4444'
    if (dias >= 7)  return '#F59E0B'
    return '#10B981'
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Vendix — Reporte ${mes}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Arial, sans-serif; color: #1A1A2E; font-size: 12px; }
  .header { background: #1A1A2E; color: white; padding: 20px 28px; display: flex; justify-content: space-between; align-items: center; }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon { background: #04dedf; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900; color: #1A1A2E; }
  .logo-name { font-size: 18px; font-weight: 800; }
  .logo-sub { font-size: 9px; color: #04dedf; letter-spacing: 1px; }
  .header-right { text-align: right; }
  .mes { font-size: 13px; font-weight: 700; }
  .fecha { font-size: 10px; color: #9CA3AF; margin-top: 3px; }
  .content { padding: 22px 28px; }
  .vendedor-card { background: #F5F7F8; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; }
  .vendedor-nombre { font-size: 16px; font-weight: 800; }
  .vendedor-email { font-size: 11px; color: #9CA3AF; margin-top: 3px; }
  .section-title { font-size: 10px; font-weight: 700; color: #9CA3AF; letter-spacing: 1.5px; text-transform: uppercase; margin: 20px 0 10px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .stat-card { background: white; border: 0.5px solid #E8ECEF; border-radius: 10px; padding: 12px; text-align: center; }
  .stat-num { font-size: 24px; font-weight: 800; }
  .stat-label { font-size: 9px; color: #9CA3AF; margin-top: 3px; }
  .pipeline-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .pipe-card { border-radius: 8px; padding: 10px; text-align: center; }
  .pipe-num { font-size: 20px; font-weight: 800; }
  .pipe-label { font-size: 9px; font-weight: 600; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1A1A2E; color: white; padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; }
  td { padding: 7px 10px; border-bottom: 0.5px solid #F3F4F6; }
  tr:nth-child(even) td { background: #FAFAFA; }
  .badge { font-weight: 700; padding: 2px 8px; border-radius: 20px; font-size: 10px; display: inline-block; }
  .divider { height: 1px; background: #E8ECEF; margin: 24px 0; }
  .page-break { page-break-before: always; }
  .footer { background: #1A1A2E; color: #9CA3AF; text-align: center; padding: 12px; font-size: 9px; margin-top: 28px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="logo">
    <div class="logo-icon">V</div>
    <div>
      <div class="logo-name">Vendix</div>
      <div class="logo-sub">EL CRM DEL VENDEDOR</div>
    </div>
  </div>
  <div class="header-right">
    <div class="mes">Reporte de cierre — ${mes.charAt(0).toUpperCase() + mes.slice(1)}</div>
    <div class="fecha">Generado el ${hoy} · ${userEmail}</div>
  </div>
</div>

<div class="content">

  <div class="vendedor-card">
    <div class="vendedor-nombre">${userName}</div>
    <div class="vendedor-email">${userEmail}</div>
  </div>

  <div class="section-title">Resumen del mes</div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-num" style="color:#10B981">${vendidos.length}</div>
      <div class="stat-label">Ventas cerradas</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#04dedf">${tasa}%</div>
      <div class="stat-label">Tasa de cierre</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#F59E0B">${promedio > 0 ? promedio + 'd' : '—'}</div>
      <div class="stat-label">Días promedio</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#1A1A2E">${clients.length}</div>
      <div class="stat-label">Total clientes</div>
    </div>
  </div>

  <div class="section-title">Pipeline actual</div>
  <div class="pipeline-grid">
    <div class="pipe-card" style="background:#FEF2F2">
      <div class="pipe-num" style="color:#EF4444">${hot}</div>
      <div class="pipe-label" style="color:#EF4444">Hot</div>
    </div>
    <div class="pipe-card" style="background:#FFFBEB">
      <div class="pipe-num" style="color:#F59E0B">${warm}</div>
      <div class="pipe-label" style="color:#F59E0B">Warm</div>
    </div>
    <div class="pipe-card" style="background:#EFF6FF">
      <div class="pipe-num" style="color:#3B82F6">${cold}</div>
      <div class="pipe-label" style="color:#3B82F6">Cold</div>
    </div>
    <div class="pipe-card" style="background:#ECFDF5">
      <div class="pipe-num" style="color:#10B981">${conDocs}</div>
      <div class="pipe-label" style="color:#10B981">Con docs</div>
    </div>
  </div>

  ${vendidos.length > 0 ? `
  <div class="section-title">Ventas cerradas</div>
  <table>
    <tr><th>Cliente</th><th>Vehículo</th><th>Fecha de cierre</th><th>Días</th></tr>
    ${vendidos.map(c => {
      const dias = c.sale_date && c.created_at
        ? Math.floor((new Date(c.sale_date).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : null
      return `<tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.vehicle_interest || '—'}</td>
        <td>${c.sale_date ? new Date(c.sale_date).toLocaleDateString('es-PY') : '—'}</td>
        <td>${dias !== null ? `<span class="badge" style="background:#ECFDF5;color:#10B981">${dias}d</span>` : '—'}</td>
      </tr>`
    }).join('')}
  </table>
  ` : ''}

  ${docsListos.length > 0 ? `
  <div class="section-title">Listos para cerrar — con documentos</div>
  <table>
    <tr><th>Cliente</th><th>Vehículo</th><th>Temperatura</th></tr>
    ${docsListos.map(c => `<tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.vehicle_interest || '—'}</td>
      <td><span class="badge" style="background:${c.temperature === 'hot' ? '#FEF2F2' : '#FFFBEB'};color:${c.temperature === 'hot' ? '#EF4444' : '#F59E0B'}">${c.temperature === 'hot' ? '🔴 Hot' : '🟡 Warm'}</span></td>
    </tr>`).join('')}
  </table>
  ` : ''}

  <div class="divider"></div>

  <div class="section-title">Planilla detallada — todos los clientes (${clients.length})</div>
  <table>
    <tr>
      <th>#</th>
      <th>Cliente</th>
      <th>Vehículo</th>
      <th>Estado</th>
      <th>Días sin contacto</th>
      <th>Docs</th>
    </tr>
    ${clients.map((c, i) => {
      const dias = diasSinContacto(c)
      const color = diasColor(dias, c)
      return `<tr>
        <td style="color:#9CA3AF">${i + 1}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.vehicle_interest || '—'}</td>
        <td><span class="badge" style="background:${estadoColor(c)}22;color:${estadoColor(c)}">${estadoLabel(c)}</span></td>
        <td><span class="badge" style="background:${color}22;color:${color}">${c.sold ? 'Cerrado' : dias + ' días'}</span></td>
        <td>${c.docs_received ? '<span class="badge" style="background:#ECFDF5;color:#10B981">📄 OK</span>' : '<span style="color:#9CA3AF">—</span>'}</td>
      </tr>`
    }).join('')}
  </table>

</div>

<div class="footer">
  Vendix · El CRM del vendedor · vendix-crm.vercel.app · Reporte generado el ${hoy}
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`

  const ventana = window.open('', '_blank')
  if (ventana) {
    ventana.document.write(html)
    ventana.document.close()
  }
}