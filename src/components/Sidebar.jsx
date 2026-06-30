import {
  Briefcase,
  Inbox,
  BarChart3,
  User,
  X,
  Shield
} from 'lucide-react'
import { canViewReportes, roleLabel } from '../security/rbac'

const NAV_ICONS = {
  cartera: Briefcase,
  cola: Inbox,
  reportes: BarChart3,
  perfil: User
}

export default function Sidebar({ active, stats, onNavigate, role, isOpen, onClose }) {
  const items = [
    { id: 'cartera', label: 'Mi cartera', badge: stats.cartera > 0 ? stats.cartera : null },
    { id: 'cola', label: 'Cola core', badge: stats.cola > 0 ? stats.cola : null },
    ...(canViewReportes(role) ? [{ id: 'reportes', label: 'Reportes' }] : []),
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
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">FV</div>
          <div>
            <strong>CMAC Ica</strong>
            <span>FUERZA DE VENTAS</span>
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
