import { useState } from 'react'
import {
  decidirComite,
  guardarNotas,
  ponerEnEvaluacion,
  recibirEnComite
} from '../../services/comiteService'
import {
  claseEstado,
  etiquetaEstado,
  formatFecha,
  formatSoles,
  montoAprobado
} from '../../utils'
import DecisionModal from './DecisionModal'
import SolicitudActions from './SolicitudActions'

export default function SolicitudesTable({ solicitudes }) {
  const [modal, setModal] = useState(null)
  const [loadingId, setLoadingId] = useState(null)

  async function runAction(id, action) {
    setLoadingId(id)
    try {
      await action()
    } catch (e) {
      alert(e.message || 'Error al procesar la solicitud')
    } finally {
      setLoadingId(null)
    }
  }

  function actionProps(s) {
    const busy = loadingId === s.id
    return {
      solicitud: s,
      busy,
      onRecibir: () => runAction(s.id, () => recibirEnComite(s.id)),
      onEvaluar: () => runAction(s.id, () => ponerEnEvaluacion(s.id)),
      onDecidir: (tipo) => setModal({ solicitud: s, tipo }),
      onNotas: () => setModal({ solicitud: s, tipo: 'NOTAS' })
    }
  }

  if (!solicitudes.length) {
    return (
      <div className="table-empty">
        <p>No hay expedientes que coincidan con el filtro.</p>
      </div>
    )
  }

  return (
    <>
      <div className="table-wrap table-desktop">
        <table className="data-table">
          <thead>
            <tr>
              <th>Expediente</th>
              <th>Cliente</th>
              <th>Solicitado</th>
              <th>Aprobado</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => {
              const aprobado = montoAprobado(s)
              return (
                <tr key={s.id}>
                  <td className="mono">{s.expediente || '—'}</td>
                  <td>
                    <strong>{s.nombreCliente || '—'}</strong>
                    <small>DNI {s.documentoCliente || '—'}</small>
                  </td>
                  <td>{formatSoles(s.monto)}</td>
                  <td>
                    {['aprobado', 'desembolsado'].includes(s.estado)
                      ? formatSoles(aprobado)
                      : '—'}
                  </td>
                  <td>
                    <span className={`badge ${claseEstado(s.estado)}`}>
                      {etiquetaEstado(s.estado)}
                    </span>
                  </td>
                  <td>{formatFecha(s.updatedAt || s.createdAt)}</td>
                  <td>
                    <SolicitudActions {...actionProps(s)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="solicitud-cards">
        {solicitudes.map((s) => {
          const aprobado = montoAprobado(s)
          return (
            <article key={s.id} className="solicitud-card">
              <div className="solicitud-card-head">
                <span className="mono">{s.expediente || '—'}</span>
                <span className={`badge ${claseEstado(s.estado)}`}>
                  {etiquetaEstado(s.estado)}
                </span>
              </div>
              <div className="solicitud-card-body">
                <p>
                  <strong>{s.nombreCliente || '—'}</strong>
                  <small>DNI {s.documentoCliente || '—'}</small>
                </p>
                <div className="solicitud-card-meta">
                  <span>Solicitado: {formatSoles(s.monto)}</span>
                  {['aprobado', 'desembolsado'].includes(s.estado) && (
                    <span>Aprobado: {formatSoles(aprobado)}</span>
                  )}
                  <span>{formatFecha(s.updatedAt || s.createdAt)}</span>
                </div>
              </div>
              <SolicitudActions {...actionProps(s)} />
            </article>
          )
        })}
      </div>

      {modal && (
        <DecisionModal
          solicitud={modal.solicitud}
          tipo={modal.tipo}
          onClose={() => setModal(null)}
          onConfirm={async (motivo) => {
            if (modal.tipo === 'NOTAS') {
              await guardarNotas(modal.solicitud.id, motivo)
            } else {
              await decidirComite(
                modal.solicitud.id,
                modal.tipo,
                motivo,
                modal.solicitud.monto
              )
            }
            setModal(null)
          }}
        />
      )}
    </>
  )
}
