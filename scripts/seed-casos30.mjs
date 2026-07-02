/**
 * Carga los 30 casos usando Firebase Client SDK (no requiere cuenta de servicio).
 *
 * Ejecutar desde CajaIcaVentasWeb:
 *   node scripts/seed-casos30.mjs
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')

function loadEnv() {
  const env = {}
  const raw = readFileSync(join(root, '.env'), 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

const env = loadEnv()
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
}

const casosPath = join(__dir, '../../CajaIcaHomeBanking/docs/casos/casos_30_credito.json')
const data = JSON.parse(readFileSync(casosPath, 'utf8'))

const AGENCIA = 'AG-Ica-01'
const ASESOR = 'EMP-45821'
const CLAVE = data.meta.claveDemo || '123456'
const ASESOR_EMAIL = `${ASESOR.toLowerCase()}@ventas.cmacica.pe`

function pad(n) {
  return String(n).padStart(2, '0')
}

function splitNombre(completo) {
  const parts = (completo || '').trim().split(/\s+/)
  if (parts.length <= 1) return { nombre: completo || 'Cliente', apellidos: '' }
  return { nombre: parts[0], apellidos: parts.slice(1).join(' ') }
}

function mapGarantia(g) {
  const x = (g || '').toLowerCase()
  if (x.includes('hipotec')) return 'Hipotecaria'
  if (x.includes('vehic')) return 'Vehicular'
  return 'Sin garantía real'
}

async function ensureUser(auth, email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    return cred.user
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return cred.user
    }
    throw e
  }
}

function buildSolicitud(caso, uid, now) {
  const solicitudId = `caso-${pad(caso.id)}`
  const s = caso.solicitud
  const v = caso.asesor.visita
  return {
    solicitudId,
    data: {
      expediente: `EXP-CASO-${pad(caso.id)}`,
      casoPracticaId: caso.id,
      clienteUid: uid,
      documentoCliente: caso.cliente.documento,
      nombreCliente: caso.cliente.nombre,
      telefonoCliente: caso.cliente.telefono,
      monto: s.monto,
      plazoMeses: s.plazoMeses,
      destino: s.destino,
      garantia: mapGarantia(s.garantia),
      producto: s.producto,
      teaPct: s.teaPct,
      conSeguroDesgravamen: s.conSeguroDesgravamen,
      cuotaReferencia: s.cuotaReferencia,
      canal: 'cliente',
      estado: 'enviado',
      agenciaId: AGENCIA,
      asesorCodigo: ASESOR,
      tipoGestion: 'NUEVA_SOLICITUD',
      prioridad: caso.asesor.prioridad,
      negocio: caso.negocio,
      metaComite: {
        decisionEsperada: caso.comite.decision,
        montoAprobadoEsperado: caso.comite.montoAprobado,
        motivoCondicion: caso.comite.motivoCondicion,
        motivoRechazo: caso.comite.motivoRechazo
      },
      metaBuro: caso.buro,
      metaPreEval: caso.preEvaluacion,
      visita: {
        visitado: false,
        observacion: '',
        latitud: v.lat,
        longitud: v.lng,
        fecha: ''
      },
      createdAt: now + caso.id,
      updatedAt: now + caso.id
    }
  }
}

async function promoverComoAsesor(auth, db, items) {
  console.log('\nPromoviendo solicitudes a recibido_core como asesor...')
  try {
    await signInWithEmailAndPassword(auth, ASESOR_EMAIL, CLAVE)
  } catch (e) {
    console.warn(
      `No se pudo iniciar sesión como ${ASESOR_EMAIL}. Las solicitudes quedan en estado enviado.\n` +
        `Crea el usuario asesor en Firebase Auth o continúa igual (el portal las muestra igualmente).\n` +
        `Detalle: ${e.message}`
    )
    return
  }

  for (const { solicitudId, data: base } of items) {
    const now = Date.now()
    const solicitud = {
      ...base,
      estado: 'recibido_core',
      updatedAt: now
    }
    await setDoc(doc(db, 'solicitudes_credito', solicitudId), solicitud, { merge: true })
    await setDoc(doc(db, 'core_cola', solicitudId), {
      solicitudId,
      expediente: solicitud.expediente,
      estado: 'pendiente_promocion',
      agenciaId: AGENCIA,
      asesorCodigo: ASESOR,
      casoPracticaId: solicitud.casoPracticaId,
      createdAt: solicitud.createdAt
    })
    await setDoc(doc(db, 'cartera_dia', ASESOR, 'items', solicitudId), {
      solicitudId,
      expediente: solicitud.expediente,
      documentoCliente: solicitud.documentoCliente,
      nombreCliente: solicitud.nombreCliente,
      tipoGestion: 'NUEVA_SOLICITUD',
      estado: 'recibido_core',
      monto: solicitud.monto,
      prioridad: solicitud.prioridad,
      casoPracticaId: solicitud.casoPracticaId,
      createdAt: solicitud.createdAt
    })
  }
  console.log(`✓ ${items.length} solicitudes en cartera del asesor ${ASESOR}`)
}

async function main() {
  if (!firebaseConfig.apiKey) {
    console.error('Falta .env con VITE_FIREBASE_* en CajaIcaVentasWeb')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const now = Date.now()
  const items = []

  console.log(`Cargando ${data.casos.length} casos en Firebase (${firebaseConfig.projectId})...\n`)

  let ok = 0
  let err = 0

  for (const caso of data.casos) {
    const label = `Caso ${caso.id} — ${caso.cliente.documento}`
    try {
      const user = await ensureUser(auth, caso.cliente.email, CLAVE)
      const { nombre, apellidos } = splitNombre(caso.cliente.nombre)

      await setDoc(
        doc(db, 'clientes', user.uid),
        {
          documento: caso.cliente.documento,
          nombre,
          apellidos,
          nombreCompleto: caso.cliente.nombre,
          email: caso.cliente.email,
          telefono: caso.cliente.telefono,
          saldo: 5000,
          negocio: caso.negocio,
          casoPracticaId: caso.id
        },
        { merge: true }
      )

      const { solicitudId, data: solicitudData } = buildSolicitud(caso, user.uid, now)
      await setDoc(doc(db, 'solicitudes_credito', solicitudId), solicitudData, { merge: true })
      items.push({ solicitudId, data: solicitudData })

      console.log(`✓ ${label} → ${solicitudData.expediente}`)
      ok++
    } catch (e) {
      console.error(`✗ ${label}:`, e.message || e)
      err++
    }
  }

  await promoverComoAsesor(auth, db, items)

  console.log(`
Listo: ${ok} casos cargados, ${err} errores.

Login clientes (app): DNI + clave ${CLAVE}
Login asesor (web): ${ASESOR} / ${CLAVE}
Login comité (web): COM-001 / ${CLAVE}

Expedientes: EXP-CASO-01 … EXP-CASO-30
`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
