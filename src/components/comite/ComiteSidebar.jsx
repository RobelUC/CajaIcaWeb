import { Home, ClipboardList, Search, User, X, Shield } from 'lucide-react'
import { roleLabel } from '../../security/rbac'

const NAV_ICONS = {
  inicio: Home,
  solicitudes: ClipboardList,
  evaluacion: Search,
  perfil: User
}

export default function ComiteSidebar({ active, stats, onNavigate, role, isOpen, onClose }) {
  const items = [
    { id: 'inicio', label: 'Inicio' },
    {
      id: 'solicitudes',
      label: 'Solicitudes',
      badge: stats.total > 0 ? stats.total : null
    },
    {
      id: 'evaluacion',
      label: 'Evaluación',
      badge: stats.evaluacion > 0 ? stats.evaluacion : null
    },
    { id: 'perfil', label: 'Perfil' }
  ]

  function handleNav(id) {
    onNavigate(id)
    onClose?.()
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'sidebar-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside className={`sidebar sidebar--comite ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo brand-logo--comite">CI</div>
          <div>
            <strong>CMAC Ica</strong>
            <span>COMITÉ DE CRÉDITO</span>
          </div>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => {
            const Icon = NAV_ICONS[item.id]
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => handleNav(item.id)}
              >
                <span className="nav-icon">{Icon ? <Icon size={18} /> : null}</span>
                {item.label}
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <Shield size={14} />
          <small>{roleLabel(role)}</small>
        </div>
      </aside>
    </>
  )
}
