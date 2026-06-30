import { getFunctions, httpsCallable } from 'firebase/functions'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, codigoToEmail, app, isValidPortalCodigo } from '../firebase'
import { roleFromEmail, canAccessPortal } from '../security/rbac'
import { saveToken, clearToken } from '../security/tokenStore'
import { localCheckLock, localRecordFailed, localClearAttempts } from '../security/loginLockLocal'

const functions = getFunctions(app, 'us-central1')
const MAX_ATTEMPTS = 5

let cloudLockAvailable = import.meta.env.VITE_USE_LOCAL_AUTH === 'true' ? false : null

function useLocalLock() {
  return cloudLockAvailable === false || import.meta.env.VITE_USE_LOCAL_AUTH === 'true'
}

async function callCloudLock(fnName, payload) {
  const fn = httpsCallable(functions, fnName)
  const { data } = await fn(payload)
  return data
}

async function checkLock(identifier) {
  if (useLocalLock()) return localCheckLock(identifier)
  try {
    const data = await callCloudLock('checkLoginLock', { identifier })
    cloudLockAvailable = true
    return data
  } catch {
    cloudLockAvailable = false
    return localCheckLock(identifier)
  }
}

async function recordFailed(identifier) {
  if (useLocalLock()) return localRecordFailed(identifier)
  try {
    const data = await callCloudLock('recordFailedLogin', { identifier })
    cloudLockAvailable = true
    return data
  } catch {
    cloudLockAvailable = false
    return localRecordFailed(identifier)
  }
}

async function clearAttempts(identifier) {
  if (useLocalLock()) {
    localClearAttempts(identifier)
    return
  }
  try {
    await callCloudLock('clearLoginAttempts', { identifier })
    cloudLockAvailable = true
  } catch {
    cloudLockAvailable = false
    localClearAttempts(identifier)
  }
}

async function syncRole() {
  const fn = httpsCallable(functions, 'syncUserRole')
  const { data } = await fn({})
  return data.role
}

function authErrorMessage(err) {
  const code = err?.code || ''
  const messages = {
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/user-not-found': 'Usuario no registrado en Firebase',
    'auth/wrong-password': 'Clave incorrecta',
    'auth/invalid-email': 'Email inválido',
    'auth/too-many-requests': 'Demasiados intentos. Espere un momento.',
    'auth/internal-error': 'Error de Firebase. Verifique .env y el usuario en Authentication.'
  }
  return messages[code] || 'Credenciales inválidas'
}

export async function loginWithRbac(codigo, clave) {
  if (!isValidPortalCodigo(codigo)) {
    throw new Error('Ingresa un código válido (EMP-, SUP-, ADM- o COM-)')
  }
  const email = codigoToEmail(codigo)
  const lock = await checkLock(email)
  if (lock.locked) {
    throw new Error('Cuenta bloqueada por 5 intentos fallidos. Intente más tarde.')
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, clave)
    let role = roleFromEmail(cred.user.email)
    try {
      role = (await syncRole()) || role
    } catch {
      /* functions opcionales */
    }
    if (!canAccessPortal(role)) {
      throw new Error('Esta cuenta no tiene acceso al portal.')
    }
    const jwt = await cred.user.getIdToken(true)
    saveToken(jwt, role)
    await clearAttempts(email)
    return { user: cred.user, role, jwt }
  } catch (e) {
    if (e.message?.includes('acceso al portal')) throw e
    const after = await recordFailed(email)
    if (after.locked) {
      throw new Error('Cuenta bloqueada tras 5 intentos fallidos.')
    }
    const rest = MAX_ATTEMPTS - (after.attempts || 0)
    throw new Error(`${authErrorMessage(e)} (${rest} intentos restantes)`)
  }
}

export function logoutRbac() {
  clearToken()
}
