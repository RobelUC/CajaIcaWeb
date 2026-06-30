import SolicitudesTable from './SolicitudesTable'

const ESTADOS_EVALUACION = ['promovido_nucleo', 'recibido_comite', 'en_evaluacion']

export default function EvaluacionPanel({ solicitudes }) {
  const pendientes = solicitudes.filter((s) => ESTADOS_EVALUACION.includes(s.estado))

  return (
    <main className="content">
      <header className="page-header">
        <div>
          <h2>Evaluación</h2>
          <p>
            Expedientes pendientes de recepción, evaluación o decisión del comité —{' '}
            <strong>{pendientes.length}</strong> en cola
          </p>
        </div>
      </header>

      <div className="eval-hint">
        <p>
          <strong>Flujo:</strong> Recibir → Evaluar → Aprobar / Condicionar / Rechazar
        </p>
      </div>

      {pendientes.length === 0 ? (
        <div className="table-empty">
          <p>No hay expedientes pendientes de evaluación en este momento.</p>
          <p className="muted">Los nuevos expedientes promovidos al núcleo aparecerán aquí.</p>
        </div>
      ) : (
        <SolicitudesTable solicitudes={pendientes} />
      )}
    </main>
  )
}
