export default function SolicitudActions({
  solicitud,
  busy,
  onRecibir,
  onEvaluar,
  onDecidir,
  onDesembolsar,
  onNotas
}) {
  const { estado } = solicitud
  const puedeDesembolsar = estado === 'aprobado' || estado === 'condicionado'

  return (
    <div className="row-actions">
      {estado === 'promovido_nucleo' && (
        <button type="button" className="btn btn-sm btn-gold" disabled={busy} onClick={onRecibir}>
          Recibir
        </button>
      )}
      {(estado === 'recibido_comite' || estado === 'en_evaluacion') && (
        <>
          <button
            type="button"
            className="btn btn-sm btn-success"
            disabled={busy}
            onClick={() => onDecidir('APROBADO')}
          >
            Aprobar
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={busy}
            onClick={() => onDecidir('CONDICIONADO')}
          >
            Condicionar
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={busy}
            onClick={() => onDecidir('RECHAZADO')}
          >
            Rechazar
          </button>
          {estado === 'recibido_comite' && (
            <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={onEvaluar}>
              Evaluar
            </button>
          )}
        </>
      )}
      {puedeDesembolsar && (
        <button type="button" className="btn btn-sm btn-success" disabled={busy} onClick={onDesembolsar}>
          Desembolsar
        </button>
      )}
      {estado === 'desembolsado' && (
        <span className="badge badge-green">Desembolsado</span>
      )}
      <button type="button" className="btn btn-sm btn-notes" onClick={onNotas}>
        Notas
      </button>
    </div>
  )
}
