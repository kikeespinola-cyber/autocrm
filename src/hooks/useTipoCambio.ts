import { useState, useEffect } from 'react'

export function useTipoCambio() {
  const [usdPyg, setUsdPyg] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?from=USD&to=PYG')
      .then(r => r.json())
      .then(data => {
        if (data?.rates?.PYG) setUsdPyg(data.rates.PYG)
      })
      .catch(() => setUsdPyg(7500)) // fallback si falla la API
  }, [])

  function formatDual(valorPyg: string | null): string {
    if (!valorPyg || !usdPyg) return valorPyg || ''
    
    // Extraer número del string (ej: "₲ 180.000.000" → 180000000)
    const numero = parseFloat(valorPyg.replace(/[^\d]/g, ''))
    if (isNaN(numero) || numero === 0) return valorPyg

    const usd = Math.round(numero / usdPyg)
    const usdFormatted = usd.toLocaleString('es-PY')
    return `${valorPyg}  ·  USD ${usdFormatted}`
  }

  return { usdPyg, formatDual }
}