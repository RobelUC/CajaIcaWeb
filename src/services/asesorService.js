import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const COL_ASESORES = 'asesores'
export const AGENCIA_DEFAULT = 'AG-Ica-01'

export async function obtenerPerfil(codigo) {
  const c = codigo.trim().toUpperCase()
  try {
    const snap = await getDoc(doc(db, COL_ASESORES, c))
    if (!snap.exists()) return perfilDemo(c)
    const data = snap.data()
    return {
      codigo: data.codigo || c,
      nombre: data.nombre || c,
      agenciaId: data.agenciaId || AGENCIA_DEFAULT,
      activo: data.activo !== false
    }
  } catch {
    return perfilDemo(c)
  }
}

export function perfilDemo(codigo) {
  return {
    codigo: codigo.trim().toUpperCase(),
    nombre: `Asesor ${codigo.trim().toUpperCase()}`,
    agenciaId: AGENCIA_DEFAULT,
    activo: true
  }
}
