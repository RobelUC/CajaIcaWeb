import { Menu, Clock, LogOut } from 'lucide-react'
import { roleLabel } from '../../security/rbac'

export default function ComiteTopBar({
  operador,
  hora,
  busqueda,
  onBusqueda,
  onLogout,
  onProfile,
  onMenuToggle
}) {
  const horaStr = hora.toLocaleTimeString('es-PE', { hour12: false })

  return (
    <header className="topbar topbar--comite">
      <button type="button" className="btn-menu" onClick={onMenuToggle} aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      <div className="topbar-left">
        <span className="portal-tag">COMITÉ DE CRÉDITO</span>
        <strong>CMAC Ica — {operador.codigo}</strong>
      </div>
      <div className="topbar-search">
        <span className="search-icon">🔍</span>
        <input
          type="search"
          placeholder="Buscar cliente, expediente o DNI"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
        />
      </div>
      <div className="topbar-right">
        <span className="clock-chip">
          <Clock size={14} />
          {horaStr}
        </span>
        <button type="button" className="user-chip user-chip-btn" onClick={onProfile} title="Ver perfil">
          <div className="avatar">{operador.codigo.slice(0, 2)}</div>
          <div className="user-chip-text">
            <strong>{operador.codigo}</strong>
            <span>{roleLabel(operador.rol)}</span>
          </div>
        </button>
        <button type="button" className="btn-logout-icon" onClick={onLogout} title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
