import {
  Briefcase,
  Filter,
  ArrowDownWideNarrow,
  User,
  Banknote,
  MapPin,
  FileText,
  CircleDot,
  FolderOpen
} from 'lucide-react'
import { FILTROS, ORDENES, filtrarCartera, ordenarCartera } from '../domain/carteraFilters'
import { etiquetaEstado, formatSoles, semaforoColor } from '../utils'

const FILTRO_LABELS = {
  [FILTROS.TODOS]: 'Todos',
  [FILTROS.PENDIENTE_VISITA]: 'Pend. visita',
  [FILTROS.EN_GESTION]: 'En gestión',
  [FILTROS.LISTO_COMITE]: 'Listo comité'
}

const ORDEN_LABELS = {
  [ORDENES.FECHA_DESC]: 'Fecha ↓',
  [ORDENES.MONTO_DESC]: 'Monto ↓',
  [ORDENES.MONTO_ASC]: 'Monto ↑',
  [ORDENES.NOMBRE_ASC]: 'Nombre A-Z'
}

export default function CarteraPanel({
  items,
  filtro,
  orden,
  onFiltroChange,
  onOrdenChange,
  onOpenExpediente,
  loading,
  stats
}) {
  const filtered = ordenarCartera(filtrarCartera(items, filtro), orden)
  const visitados = items.filter((i) => i.visitaRegistrada).length
  const listos = items.filter((i) => ['documentos_firmados', 'promovido_nucleo'].includes(i.estado)).length

  return (
    <main className="content">
      <div className="page-hero">
        <div className="page-hero-icon">
          <Briefcase size={26} />
        </div>
        <div className="page-hero-text">
          <h2>Mi cartera</h2>
          <p>{filtered.length} expediente(s) · gestión comercial en campo</p>
        </div>
      </div>

      <div className="stats-strip">
        <div className="stat-tile">
          <div className="stat-tile-icon stat-tile-icon--red">
            <FolderOpen size={22} />
          </div>
          <div>
            <div className="stat-tile-value">{items.length}</div>
            <div className="stat-tile-label">En cartera</div>
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-icon stat-tile-icon--green">
            <MapPin size={22} />
          </div>
          <div>
            <div className="stat-tile-value">{visitados}</div>
            <div className="stat-tile-label">Con visita GPS</div>
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-icon stat-tile-icon--gold">
            <FileText size={22} />
          </div>
          <div>
            <div className="stat-tile-value">{listos}</div>
            <div className="stat-tile-label">Listos / comité</div>
          </div>
        </div>
        {stats?.cola != null ? (
          <div className="stat-tile">
            <div className="stat-tile-icon stat-tile-icon--gold">
              <Briefcase size={22} />
            </div>
            <div>
              <div className="stat-tile-value">{stats.cola}</div>
              <div className="stat-tile-label">En cola core</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="filters-panel">
        <div className="filters-label">
          <Filter size={14} />
          Filtrar por estado
        </div>
        <div className="chip-row">
          {Object.values(FILTROS).map((f) => (
            <button
              key={f}
              type="button"
              className={`chip ${filtro === f ? 'chip--active' : ''}`}
              onClick={() => onFiltroChange(f)}
            >
              {FILTRO_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="filters-label" style={{ marginTop: 12 }}>
          <ArrowDownWideNarrow size={14} />
          Ordenar
        </div>
        <div className="chip-row">
          {Object.values(ORDENES).map((o) => (
            <button
              key={o}
              type="button"
              className={`chip chip--outline ${orden === o ? 'chip--active' : ''}`}
              onClick={() => onOrdenChange(o)}
            >
              {ORDEN_LABELS[o]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
          <p>Cargando cartera…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Briefcase size={28} />
          </div>
          <p>No hay expedientes en tu cartera.</p>
          <p className="muted">Toma solicitudes de la cola core o crea una originación en campo.</p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((item) => (
            <button
              key={item.solicitudId}
              type="button"
              className="cartera-card"
              style={{ '--card-accent': semaforoColor(item.semaforo) }}
              onClick={() => onOpenExpediente(item.solicitudId)}
            >
              <div className="cartera-card-inner">
                <div className="cartera-card-head">
                  <span className="cartera-expediente">{item.expediente}</span>
                  <span
                    className="semaforo-dot"
                    style={{ background: semaforoColor(item.semaforo) }}
                    title={item.semaforo}
                  />
                </div>
                <div className="cartera-row">
                  <User size={16} />
                  {item.nombreCliente}
                </div>
                <div className="cartera-row cartera-monto">
                  <Banknote size={18} />
                  {formatSoles(item.monto)}
                </div>
                <div className="cartera-estado">
                  <CircleDot size={14} />
                  {etiquetaEstado(item.estado)}
                </div>
                <div className="cartera-badges">
                  {item.visitaRegistrada ? (
                    <span className="badge badge-green">
                      <MapPin size={12} />
                      GPS
                    </span>
                  ) : null}
                  <span className="badge badge-gold">{item.semaforo}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
