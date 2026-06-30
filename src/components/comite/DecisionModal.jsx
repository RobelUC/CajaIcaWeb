import { useState } from 'react'

const TITLES = {
  APROBADO: 'Aprobar crédito',
  CONDICIONADO: 'Condicionar crédito',
  RECHAZADO: 'Rechazar crédito',
  NOTAS: 'Notas del comité'
}

export default function DecisionModal({ solicitud, tipo, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState(solicitud.notasComite || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm(motivo)
    } catch (err) {
      alert(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{TITLES[tipo]}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal-body">
          <p>
            <strong>{solicitud.expediente}</strong> — {solicitud.nombreCliente}
          </p>
          <p className="modal-meta">
            Monto solicitado: S/ {Number(solicitud.monto || 0).toFixed(2)} · Plazo{' '}
            {solicitud.plazoMeses} meses
          </p>
          <form onSubmit={handleSubmit}>
            <label>
              {tipo === 'NOTAS' ? 'Observaciones' : 'Motivo / comentario'}
              <textarea
                rows={4}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={
                  tipo === 'RECHAZADO'
                    ? 'Indique el motivo del rechazo…'
                    : 'Comentario opcional del comité…'
                }
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className={`btn ${
                  tipo === 'RECHAZADO'
                    ? 'btn-danger'
                    : tipo === 'APROBADO'
                      ? 'btn-success'
                      : 'btn-primary'
                }`}
                disabled={loading}
                style={{ width: 'auto' }}
              >
                {loading ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
