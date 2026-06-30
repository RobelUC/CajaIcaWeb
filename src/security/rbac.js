export const ROLES = {
  CLIENTE: 'cliente',
  ASESOR: 'asesor',
  SUPERVISOR: 'supervisor',
  ADMINISTRADOR: 'administrador',
  COMITE: 'comite'
}

export function roleFromEmail(email) {
  if (!email) return ROLES.CLIENTE
  const e = email.toLowerCase()
  const local = e.split('@')[0]
  if (e.endsWith('@clientes.cmacica.pe')) return ROLES.CLIENTE
  if (e.endsWith('@comite.cmacica.pe')) return ROLES.COMITE
  if (e.endsWith('@ventas.cmacica.pe')) {
    if (local.startsWith('adm-')) return ROLES.ADMINISTRADOR
    if (local.startsWith('sup-')) return ROLES.SUPERVISOR
    return ROLES.ASESOR
  }
  return ROLES.CLIENTE
}

export function canViewReportes(role) {
  return role === ROLES.SUPERVISOR || role === ROLES.ADMINISTRADOR
}

export function canAccessVentas(role) {
  return [ROLES.ASESOR, ROLES.SUPERVISOR, ROLES.ADMINISTRADOR].includes(role)
}

export function canAccessComite(role) {
  return role === ROLES.COMITE || role === ROLES.ADMINISTRADOR
}

export function canAccessPortal(role) {
  return canAccessVentas(role) || canAccessComite(role)
}

export function canEvaluateComite(role) {
  return role === ROLES.COMITE || role === ROLES.ADMINISTRADOR
}

export function roleLabel(role) {
  const labels = {
    cliente: 'Cliente',
    asesor: 'Asesor comercial',
    supervisor: 'Supervisor',
    administrador: 'Administrador',
    comite: 'Operador comité'
  }
  return labels[role] || role
}
