import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { fechaActual } from '../utils'
import { abonarSaldoCliente, normalizarDni } from './clienteService'

const COL = 'solicitudes_credito'

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

  if (tipo === 'APROBADO') {
    payload.desembolso = {
      monto: montoSolicitado,
      fecha: '',
      cuentaDestino: '',
      cronograma: []
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
  await abonarSaldoCliente(documento, montoNum, `Desembolso crédito — ${id}`)

  await updateDoc(doc(db, COL, id), {
    estado: 'desembolsado',
    updatedAt: Date.now(),
    desembolso: {
      monto: montoNum,
      fecha: fechaActual(),
      cuentaDestino: documento,
      cronograma: cronograma.map((c) => ({
        numero: c.numero,
        fechaVencimiento: c.fechaVencimiento,
        capital: c.capital,
        interes: c.interes,
        cuota: c.cuota,
        saldo: c.saldo
      }))
    }
  })
}
