import { useState } from 'react'
import { BarChart3, Download, AlertTriangle } from 'lucide-react'
import { fetchReportes } from '../services/reportesApi'
import { roleLabel } from '../security/rbac'

export default function ReportesPanel({ role }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function cargar() {
    setLoading(true)
    const r = await fetchReportes()
    setResult(r)
    setLoading(false)
  }

  return (
    <main className="content">
      <div className="page-hero">
        <div className="page-hero-icon">
          <BarChart3 size={26} />
        </div>
        <div className="page-hero-text">
          <h2>Reportes consolidados</h2>
          <p>API backend con JWT — {roleLabel(role)}</p>
        </div>
        <button
          type="button"
          className="btn-fab-originacion"
          onClick={cargar}
          disabled={loading}
          style={{ flexShrink: 0 }}
        >
          <Download size={18} />
          <span className="label">{loading ? 'Consultando…' : 'Cargar reporte'}</span>
        </button>
      </div>
      {result && (
        <div className={`stat-card report-result ${result.ok ? '' : 'report-result--error'}`}>
          {!result.ok && result.status === 403 ? (
            <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} />
              Sin permiso. Use cuenta SUP- o ADM-.
            </p>
          ) : null}
          <strong>HTTP {result.status}</strong>
          <pre>{JSON.stringify(result.body, null, 2)}</pre>
        </div>
      )}
    </main>
  )
}
