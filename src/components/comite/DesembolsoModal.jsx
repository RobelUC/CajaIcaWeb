import { useState } from 'react'
import { montoAprobado } from '../../utils'

export default function DesembolsoModal({ solicitud, onClose, onConfirm }) {
  const montoDefault = montoAprobado(solicitud)
  const [cuentaDestino, setCuentaDestino] = useState(solicitud.desembolso?.cuentaDestino || '')
  const [monto, setMonto] = useState(String(montoDefault || solicitud.monto || ''))
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!cuentaDestino.trim()) {
      alert('Indique la cuenta destino')
      return
    }
    setLoading(true)
    try {
      await onConfirm({
        monto: parseFloat(monto) || montoDefault,
        cuentaDestino: cuentaDestino.trim(),
        cronograma: solicitud.simulacion?.cronograma || []
      })
    } catch (err) {
      alert(err.message || 'Error al registrar desembolso')
    } finally {
      setLoading(false)
    }
  }

  const cuotas = solicitud.simulacion?.cronograma?.length || 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Registrar desembolso</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal-body">
          <p>
            <strong>{solicitud.expediente}</strong> — {solicitud.nombreCliente}
          </p>
          <p className="modal-meta">
            DNI {solicitud.documentoCliente} · Plazo {solicitud.plazoMeses} meses
            {cuotas > 0 ? ` · ${cuotas} cuotas en cronograma` : ''}
          </p>
          <form onSubmit={handleSubmit}>
            <label>
              Monto a desembolsar (S/)
              <input
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0.00"
              />
            </label>
            <label>
              Cuenta destino
              <input
                value={cuentaDestino}
                onChange={(e) => setCuentaDestino(e.target.value)}
                placeholder="Ej. 001-1234567890"
                autoComplete="off"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-success" disabled={loading} style={{ width: 'auto' }}>
                {loading ? 'Registrando…' : 'Confirmar desembolso'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
