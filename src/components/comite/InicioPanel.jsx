import { claseEstado, etiquetaEstado, formatFecha, formatSoles } from '../../utils'

export default function InicioPanel({ operador, stats, solicitudes, onNavigate }) {
  const recientes = solicitudes.slice(0, 5)
  const pendientesEval = solicitudes.filter((s) =>
    ['promovido_nucleo', 'recibido_comite', 'en_evaluacion'].includes(s.estado)
  ).length

  return (
    <main className="content">
      <header className="page-header">
        <div>
          <h2>Inicio</h2>
          <p>
            Bienvenido, <strong>{operador.codigo}</strong> — Portal Comité de Crédito
          </p>
        </div>
      </header>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Pendientes evaluación</span>
          <strong>{pendientesEval}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">En comité</span>
          <strong>{stats.comite}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Aprobados</span>
          <strong>{stats.aprobados}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total expedientes</span>
          <strong>{stats.total}</strong>
        </div>
      </div>

      <div className="home-actions">
        <button type="button" className="home-card" onClick={() => onNavigate('evaluacion')}>
          <span className="home-card-icon">🔍</span>
          <div>
            <strong>Ir a evaluación</strong>
            <p>{pendientesEval} expediente(s) requieren atención del comité</p>
          </div>
        </button>
        <button type="button" className="home-card" onClick={() => onNavigate('solicitudes')}>
          <span className="home-card-icon">📋</span>
          <div>
            <strong>Ver todas las solicitudes</strong>
            <p>Consultar el listado completo de expedientes</p>
          </div>
        </button>
      </div>

      <section className="home-recent">
        <h3>Actividad reciente</h3>
        {recientes.length === 0 ? (
          <div className="table-empty">
            <p>No hay expedientes registrados.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap table-desktop">
              <table className="data-table data-table--compact">
                <thead>
                  <tr>
                    <th>Expediente</th>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {recientes.map((s) => (
                    <tr key={s.id}>
                      <td className="mono">{s.expediente || '—'}</td>
                      <td>{s.nombreCliente || '—'}</td>
                      <td>{formatSoles(s.monto)}</td>
                      <td>
                        <span className={`badge ${claseEstado(s.estado)}`}>
                          {etiquetaEstado(s.estado)}
                        </span>
                      </td>
                      <td>{formatFecha(s.updatedAt || s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="solicitud-cards">
              {recientes.map((s) => (
                <article key={s.id} className="solicitud-card solicitud-card--simple">
                  <div className="solicitud-card-head">
                    <span className="mono">{s.expediente || '—'}</span>
                    <span className={`badge ${claseEstado(s.estado)}`}>
                      {etiquetaEstado(s.estado)}
                    </span>
                  </div>
                  <div className="solicitud-card-meta">
                    <span>{s.nombreCliente || '—'}</span>
                    <span>{formatSoles(s.monto)}</span>
                    <span>{formatFecha(s.updatedAt || s.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
