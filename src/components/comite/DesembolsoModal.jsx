import { useState } from 'react'
import { normalizarDni } from '../../services/clienteService'
import { montoAprobado } from '../../utils'

export default function DesembolsoModal({ solicitud, onClose, onConfirm }) {
  const montoDefault = montoAprobado(solicitud)
  const dniDefault =
    normalizarDni(solicitud.desembolso?.cuentaDestino) ||
    normalizarDni(solicitud.documentoCliente)

  const [dni, setDni] = useState(dniDefault)
  const [monto, setMonto] = useState(String(montoDefault || solicitud.monto || ''))
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const dniLimpio = normalizarDni(dni)
    if (dniLimpio.length < 8) {
      alert('Ingrese un DNI válido (8 dígitos)')
      return
    }
    setLoading(true)
    try {
      await onConfirm({
        monto: parseFloat(monto) || montoDefault,
        dni: dniLimpio,
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
            Plazo {solicitud.plazoMeses} meses
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
              DNI del cliente (cuenta destino)
              <input
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="72639576"
                autoComplete="off"
                inputMode="numeric"
              />
            </label>
            <p className="modal-meta">
              El abono se acredita al saldo del cliente en Firebase según su DNI ({dni || '—'}).
            </p>
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
