const KEY_JWT = 'cmacica_ventas_jwt'
const KEY_ROLE = 'cmacica_ventas_role'

export function saveToken(jwt, role) {
  sessionStorage.setItem(KEY_JWT, jwt)
  sessionStorage.setItem(KEY_ROLE, role)
}

export function getToken() {
  return sessionStorage.getItem(KEY_JWT)
}

export function getRole() {
  return sessionStorage.getItem(KEY_ROLE)
}

export function clearToken() {
  sessionStorage.removeItem(KEY_JWT)
  sessionStorage.removeItem(KEY_ROLE)
}
