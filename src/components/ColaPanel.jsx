import { Inbox, Calendar, Hand, PackageOpen, User, Banknote, Trash2 } from 'lucide-react'
import { formatFecha, formatSoles } from '../utils'
export default function ColaPanel({
  items,
  onTomar,
  onBorrarExpediente,
  canDelete = false,
  loading,
  actionLoading
}) {
  return (
    <main className="content">
      <div className="page-hero">
        <div className="page-hero-icon">
          <Inbox size={26} />
        </div>
        <div className="page-hero-text">
          <h2>Cola core</h2>
          <p>Solicitudes pendientes de promoción — {items.length} en cola</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <PackageOpen size={28} />
          </div>
          <p>No hay solicitudes pendientes en la cola.</p>
          <p className="muted">Las solicitudes del canal cliente aparecerán aquí cuando lleguen al core.</p>
        </div>
      ) : (
        <div className="card-grid">
          {items.map((item) => (
            <div key={item.solicitudId} className="cola-card">
              <div className="cola-card-header">
                <div className="cola-card-icon">
                  <Inbox size={22} />
                </div>
                <div>
                  <strong>{item.expediente}</strong>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                    ID: {item.solicitudId.slice(0, 8)}…
                  </p>
                </div>
              </div>
              <div className="cartera-row">
                <Calendar size={16} />
                {formatFecha(item.createdAt)}
              </div>
              {item.nombreCliente ? (
                <div className="cartera-row">
                  <User size={16} />
                  {item.nombreCliente}
                  {item.documentoCliente ? ` · DNI ${item.documentoCliente}` : ''}
                </div>
              ) : null}
              {item.monto > 0 ? (
                <div className="cartera-row cartera-monto">
                  <Banknote size={16} />
                  {formatSoles(item.monto)}
                </div>
              ) : null}
              {item.canal === 'cliente' || item.source === 'cliente' ? (
                <span className="badge badge-gold" style={{ alignSelf: 'flex-start' }}>Canal cliente</span>
              ) : null}
              <div className="cola-card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={actionLoading}
                  onClick={() => onTomar(item.solicitudId)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 }}
                >
                  <Hand size={16} />
                  {actionLoading ? 'Asignando…' : 'Tomar solicitud'}
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={actionLoading}
                    title="Eliminar expediente"
                    onClick={() => onBorrarExpediente?.(item.solicitudId, item.expediente)}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
