import { getFunctions, httpsCallable } from 'firebase/functions'
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { app, db } from '../firebase'
import { fechaActual } from '../utils'
import { abonarSaldoCliente, normalizarDni } from './clienteService'

const COL = 'solicitudes_credito'
const functions = app ? getFunctions(app, 'us-central1') : null

function mapCronograma(cronograma = []) {
  return cronograma.map((c) => ({
    numero: c.numero,
    fechaVencimiento: c.fechaVencimiento,
    capital: c.capital,
    interes: c.interes,
    cuota: c.cuota,
    saldo: c.saldo
  }))
}

function permisoDenegado(err) {
  const code = err?.code || ''
  const msg = err?.message || ''
  return (
    code === 'permission-denied' ||
    code === 'functions/permission-denied' ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('insufficient permissions')
  )
}

function cloudFunctionFallback(err) {
  const code = err?.code || ''
  return (
    code === 'functions/not-found' ||
    code === 'functions/internal' ||
    code === 'functions/unavailable' ||
    code === 'functions/deadline-exceeded' ||
    err?.message?.includes('NOT_FOUND')
  )
}

function callableErrorMessage(err) {
  const code = err?.code || ''
  if (code === 'functions/unauthenticated') return 'Sesión expirada. Vuelva a iniciar sesión.'
  if (code === 'functions/permission-denied') return 'No tiene permisos para registrar desembolsos.'
  if (code === 'functions/invalid-argument' && err.message) return err.message
  if (code === 'functions/not-found' && err.message && err.message !== 'internal') return err.message
  if (err?.message && err.message !== 'internal') return err.message
  if (err?.details) return String(err.details)
  return 'Error al registrar desembolso'
}

async function registrarDesembolsoCloud(solicitudId, documento, montoNum, cronograma) {
  if (!functions) throw new Error('Firebase no inicializado')
  const fn = httpsCallable(functions, 'registrarDesembolso')
  await fn({
    solicitudId,
    dni: documento,
    monto: montoNum,
    cronograma: mapCronograma(cronograma)
  })
}

async function registrarDesembolsoDirecto(solicitudId, documento, montoNum, cronograma) {
  const solicitudSnap = await getDoc(doc(db, COL, solicitudId))
  const clienteUid = solicitudSnap.exists() ? solicitudSnap.data()?.clienteUid : null
  const expediente = solicitudSnap.exists() ? solicitudSnap.data()?.expediente : solicitudId

  await abonarSaldoCliente(
    documento,
    montoNum,
    `Desembolso crédito — ${expediente || solicitudId}`,
    clienteUid
  )
  await updateDoc(doc(db, COL, solicitudId), {
    estado: 'desembolsado',
    updatedAt: Date.now(),
    desembolso: {
      monto: montoNum,
      fecha: fechaActual(),
      cuentaDestino: documento,
      cronograma: mapCronograma(cronograma)
    }
  })
}

export function observeSolicitudes(callback) {
  return onSnapshot(
    collection(db, COL),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      callback(items)
    },
    () => callback([])
  )
}

export async function recibirEnComite(id) {
  await updateDoc(doc(db, COL, id), {
    estado: 'recibido_comite',
    updatedAt: Date.now()
  })
}

export async function ponerEnEvaluacion(id) {
  await updateDoc(doc(db, COL, id), {
    estado: 'en_evaluacion',
    updatedAt: Date.now()
  })
}

export async function decidirComite(id, tipo, motivo, montoSolicitado) {
  const estado =
    tipo === 'APROBADO' ? 'aprobado' : tipo === 'CONDICIONADO' ? 'condicionado' : 'rechazado'

  const payload = {
    estado,
    updatedAt: Date.now(),
    decision: {
      tipo,
      motivo: motivo || '',
      fecha: fechaActual()
    }
  }

  if (tipo === 'APROBADO' || tipo === 'CONDICIONADO') {
    const snap = await getDoc(doc(db, COL, id))
    const data = snap.exists() ? snap.data() : {}
    const sim = data.simulacion || {}
    const cronograma = Array.isArray(sim.cronograma) ? mapCronograma(sim.cronograma) : []
    payload.desembolso = {
      monto: montoSolicitado,
      fecha: '',
      cuentaDestino: data.documentoCliente || '',
      cronograma
    }
  }

  await updateDoc(doc(db, COL, id), payload)
}

export async function guardarNotas(id, notas) {
  await updateDoc(doc(db, COL, id), {
    notasComite: notas,
    updatedAt: Date.now()
  })
}

export async function registrarDesembolso(id, { monto, dni, cuentaDestino, cronograma = [] }) {
  const documento = normalizarDni(dni || cuentaDestino)
  if (documento.length < 8) {
    throw new Error('Indique el DNI del cliente (8 dígitos)')
  }

  const montoNum = Number(monto) || 0
  if (montoNum <= 0) {
    throw new Error('El monto a desembolsar debe ser mayor a cero')
  }

  try {
    await registrarDesembolsoCloud(id, documento, montoNum, cronograma)
    return
  } catch (cloudErr) {
    if (!cloudFunctionFallback(cloudErr)) {
      if (permisoDenegado(cloudErr)) {
        throw new Error(
          'Permisos insuficientes. Actualiza las reglas de Firestore o despliega la función registrarDesembolso.'
        )
      }
      throw new Error(callableErrorMessage(cloudErr))
    }
  }

  try {
    await registrarDesembolsoDirecto(id, documento, montoNum, cronograma)
  } catch (directErr) {
    if (permisoDenegado(directErr)) {
      throw new Error(
        'Permisos insuficientes en Firebase. En Firestore Rules, permite al comité actualizar clientes/saldo, o despliega la Cloud Function registrarDesembolso.'
      )
    }
    throw directErr
  }
}
