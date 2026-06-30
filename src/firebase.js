import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const missingKeys = Object.entries({
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId
})
  .filter(([, value]) => !value)
  .map(([key]) => key)

let configError = missingKeys.length
  ? `Faltan variables de entorno: ${missingKeys.join(', ')}`
  : null

export let app = null
export let auth = null
export let db = null

if (!configError) {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
  } catch (err) {
    configError = err?.message || 'No se pudo inicializar Firebase'
  }
}

export const firebaseConfigError = configError

export const VENTAS_EMAIL_DOMAIN = '@ventas.cmacica.pe'
export const COMITE_EMAIL_DOMAIN = '@comite.cmacica.pe'

export function isVentasCodigo(codigo) {
  const c = codigo.trim().toUpperCase()
  return c.startsWith('EMP-') || c.startsWith('SUP-') || c.startsWith('ADM-')
}

export function isComiteCodigo(codigo) {
  return codigo.trim().toUpperCase().startsWith('COM-')
}

export function isValidPortalCodigo(codigo) {
  return isVentasCodigo(codigo) || isComiteCodigo(codigo)
}

export function codigoToEmail(codigo) {
  const c = codigo.trim().toUpperCase()
  if (isComiteCodigo(c)) return `${c}${COMITE_EMAIL_DOMAIN}`
  return `${c}${VENTAS_EMAIL_DOMAIN}`
}

export function emailToCodigo(email) {
  if (!email) return ''
  return email.split('@')[0].trim().toUpperCase()
}
