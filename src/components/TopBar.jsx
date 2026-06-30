import { Menu, Plus, Clock, LogOut, Building2 } from 'lucide-react'
import { roleLabel } from '../security/rbac'

export default function TopBar({ operador, asesor, hora, onLogout, onProfile, onMenuToggle, onNuevaOriginacion }) {
  const horaStr = hora.toLocaleTimeString('es-PE', { hour12: false })

  return (
    <header className="topbar">
      <button type="button" className="btn-menu" onClick={onMenuToggle} aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      <div className="topbar-left">
        <span className="portal-tag">FUERZA DE VENTAS</span>
        <strong>CMAC Ica — {asesor?.nombre || operador.codigo}</strong>
        {asesor?.agenciaId ? (
          <small className="topbar-agencia">
            <Building2 size={14} />
            Agencia {asesor.agenciaId}
          </small>
        ) : null}
      </div>
      <div className="topbar-right">
        <button type="button" className="btn-fab-originacion" onClick={onNuevaOriginacion}>
          <Plus size={18} />
          <span className="label">Originación campo</span>
        </button>
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
