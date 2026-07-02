import { getFunctions, httpsCallable } from 'firebase/functions'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, codigoToEmail, app, isValidPortalCodigo } from '../firebase'
import { roleFromEmail, canAccessPortal } from '../security/rbac'
import { saveToken, clearToken } from '../security/tokenStore'
import { localCheckLock, localRecordFailed, localClearAttempts } from '../security/loginLockLocal'

const MAX_ATTEMPTS = 5

/** Por defecto NO llama a Cloud Functions (evita CORS en Vercel). Activar con VITE_USE_CLOUD_FUNCTIONS=true */
function useCloudFunctions() {
  return import.meta.env.VITE_USE_CLOUD_FUNCTIONS === 'true'
}

let functionsInstance = null
function getCloudFunctions() {
  if (!functionsInstance) {
    functionsInstance = getFunctions(app, 'us-central1')
  }
  return functionsInstance
}

async function callCloudLock(fnName, payload) {
  const fn = httpsCallable(getCloudFunctions(), fnName)
  const { data } = await fn(payload)
  return data
}

async function checkLock(identifier) {
  if (!useCloudFunctions()) return localCheckLock(identifier)
  try {
    return await callCloudLock('checkLoginLock', { identifier })
  } catch {
    return localCheckLock(identifier)
  }
}

async function recordFailed(identifier) {
  if (!useCloudFunctions()) return localRecordFailed(identifier)
  try {
    return await callCloudLock('recordFailedLogin', { identifier })
  } catch {
    return localRecordFailed(identifier)
  }
}

async function clearAttempts(identifier) {
  if (!useCloudFunctions()) {
    localClearAttempts(identifier)
    return
  }
  try {
    await callCloudLock('clearLoginAttempts', { identifier })
  } catch {
    localClearAttempts(identifier)
  }
}

async function syncRole() {
  if (!useCloudFunctions()) return null
  try {
    const fn = httpsCallable(getCloudFunctions(), 'syncUserRole')
    const { data } = await fn({})
    return data.role
  } catch {
    return null
  }
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
    const syncedRole = await syncRole()
    if (syncedRole) role = syncedRole
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
