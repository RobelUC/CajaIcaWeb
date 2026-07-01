import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where
} from 'firebase/firestore'
import { db } from '../firebase'
import { fechaActual } from '../utils'

export function normalizarDni(value) {
  return (value || '').replace(/\D/g, '')
}

export async function findClienteRefByDni(dni) {
  const documento = normalizarDni(dni)
  if (documento.length < 8) return null

  const clientesSnap = await getDocs(
    query(collection(db, 'clientes'), where('documento', '==', documento))
  )
  if (clientesSnap.empty) return null
  return clientesSnap.docs[0].ref
}

export async function abonarSaldoCliente(dni, monto, titulo) {
  const clienteRef = await findClienteRefByDni(dni)
  if (!clienteRef) {
    throw new Error(`No hay cliente registrado con DNI ${normalizarDni(dni)}`)
  }

  const montoNum = Number(monto) || 0
  if (montoNum <= 0) {
    throw new Error('El monto a desembolsar debe ser mayor a cero')
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(clienteRef)
    if (!snap.exists()) throw new Error('Cliente no encontrado')
    const saldoActual = Number(snap.data().saldo) || 0
    tx.update(clienteRef, { saldo: saldoActual + montoNum })
    const movRef = doc(collection(clienteRef, 'movimientos'))
    tx.set(movRef, {
      titulo: titulo || 'Desembolso crédito CMAC Ica',
      fecha: new Date().toISOString().slice(0, 10),
      monto: montoNum,
      esIngreso: true,
      timestamp: Date.now()
    })
  })

  return clienteRef.id
}
