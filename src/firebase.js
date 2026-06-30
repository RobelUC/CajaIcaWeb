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

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export const VENTAS_EMAIL_DOMAIN = '@ventas.cmacica.pe'

export function codigoToEmail(codigo) {
  return `${codigo.trim().toUpperCase()}${VENTAS_EMAIL_DOMAIN}`
}

export function emailToCodigo(email) {
  if (!email) return ''
  return email.split('@')[0].trim().toUpperCase()
}

export function isVentasCodigo(codigo) {
  const c = codigo.trim().toUpperCase()
  return c.startsWith('EMP-') || c.startsWith('SUP-') || c.startsWith('ADM-')
}
