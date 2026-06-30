import { getToken } from '../security/tokenStore'

const REPORTES_URL = 'https://us-central1-cajaica.cloudfunctions.net/apiReportes'

export async function fetchReportes() {
  const jwt = getToken()
  if (!jwt) {
    return { ok: false, status: 401, body: { error: '401: JWT no proporcionado' } }
  }
  const res = await fetch(REPORTES_URL, {
    headers: { Authorization: `Bearer ${jwt}` }
  })
  const body = await res.json().catch(() => ({ error: res.statusText }))
  return { ok: res.ok, status: res.status, body }
}
