import { User, BadgeCheck, Building2, Mail, Shield, LogOut } from 'lucide-react'
import { roleLabel } from '../security/rbac'

export default function PerfilPanel({ operador, asesor, onLogout, portalLabel = 'Asesor comercial' }) {
  const fields = [
    { icon: BadgeCheck, label: 'Código', value: operador.codigo },
    { icon: User, label: 'Nombre', value: asesor?.nombre || '—' },
    { icon: Building2, label: 'Agencia', value: asesor?.agenciaId || '—' },
    { icon: Shield, label: 'Rol', value: roleLabel(operador.rol) },
    { icon: Mail, label: 'Email', value: operador.email }
  ]

  return (
    <main className="content profile-layout">
      <div className="page-hero">
        <div className="page-hero-icon">
          <User size={26} />
        </div>
        <div className="page-hero-text">
          <h2>Mi perfil</h2>
          <p>{portalLabel}</p>
        </div>
      </div>

      <div className="profile-header-card">
        <div className="profile-avatar-lg">{operador.codigo.slice(0, 2)}</div>
        <h3>{asesor?.nombre || operador.codigo}</h3>
        <p>{roleLabel(operador.rol)} · {asesor?.agenciaId}</p>
      </div>

      <div className="profile-fields">
        {fields.map(({ icon: Icon, label, value }) => (
          <div key={label} className="profile-field">
            <div className="profile-field-icon">
              <Icon size={18} />
            </div>
            <div>
              <div className="profile-field-label">{label}</div>
              <div className="profile-field-value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-logout-full" onClick={onLogout}>
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </main>
  )
}
