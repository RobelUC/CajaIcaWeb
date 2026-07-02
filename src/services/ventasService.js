import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  writeBatch,
  runTransaction,
  setDoc,
  updateDoc,
  query,
  where
} from 'firebase/firestore'
import { db } from '../firebase'

import { AGENCIA_DEFAULT } from './asesorService'

const COL_SOLICITUDES = 'solicitudes_credito'
const COL_CORE_COLA = 'core_cola'
const COL_CARTERA_DIA = 'cartera_dia'
const COL_ITEMS = 'items'
const COL_CONTADORES = 'contadores'
export const ESTADO_PENDIENTE = 'pendiente_promocion'
const ESTADO_ASIGNADO = 'asignado'

export const ESTADOS = {
  EN_CARTERA_ASESOR: 'en_cartera_asesor',
  VISITADO: 'visitado',
  PRE_EVALUACION_OK: 'pre_evaluacion_ok',
  DOCUMENTOS_FIRMADOS: 'documentos_firmados',
  PROMOVIDO_NUCLEO: 'promovido_nucleo'
}

function fechaActual() {
  return new Date().toLocaleString('es-PE')
}

function mapCarteraItem(id, data) {
  return {
    solicitudId: id,
    expediente: data.expediente || '',
    documentoCliente: data.documentoCliente || '',
    nombreCliente: data.nombreCliente || '',
    tipoGestion: data.tipoGestion || '',
    estado: data.estado || '',
    monto: Number(data.monto) || 0,
    createdAt: data.createdAt || 0,
    visitaRegistrada: !!data.visitaRegistrada,
    pendingSync: false,
    semaforo: data.semaforo || 'AMARILLO',
    canalCliente: !!data.canalCliente
  }
}

const ESTADOS_COLA_CLIENTE = new Set(['enviado', 'recibido_core'])

const ESTADOS_CARTERA_EMP = new Set([
  'enviado',
  'recibido_core',
  'en_cartera_asesor',
  'visitado',
  'pre_evaluacion_ok',
  'documentos_firmados'
])

function normalizeCodigo(codigo) {
  return (codigo || '').trim().toUpperCase()
}

/** Misma fuente que el portal Comité: colección completa, filtro en cliente. */
function subscribeSolicitudesCredito(onData, onError) {
  return onSnapshot(
    collection(db, COL_SOLICITUDES),
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          solicitudId: d.id,
          ...mapColaItem(d.id, d.data(), 'cliente'),
          tipoGestion: d.data().tipoGestion || 'NUEVA_SOLICITUD'
        }))
      )
    },
    (err) => {
      console.error('subscribeSolicitudesCredito:', err)
      onError?.(err)
      onData([])
    }
  )
}

function solicitudParaCola(item, _asesorCodigo, agenciaId) {
  if (!ESTADOS_COLA_CLIENTE.has(item.estado)) return false
  return perteneceAgencia(item, agenciaId)
}

function solicitudParaCartera(item, asesorCodigo, agenciaId) {
  if (!ESTADOS_CARTERA_EMP.has(item.estado)) return false
  if (!perteneceAgencia(item, agenciaId)) return false
  const codigo = normalizeCodigo(asesorCodigo)
  const asesor = normalizeCodigo(item.asesorCodigo)
  // Canal cliente: visible para cualquier asesor de la agencia si no hay otro asesor asignado
  if (item.canal === 'cliente') return !asesor || asesor === codigo
  return !asesor || asesor === codigo
}

/** Una sola suscripción a solicitudes_credito (igual que Comité) → cartera + cola */
export function observeExpedientesEmp(asesorCodigo, agenciaId, handlers = {}) {
  const codigo = normalizeCodigo(asesorCodigo)
  const agencia = agenciaId || AGENCIA_DEFAULT
  const { onCola, onCartera, onMeta, onError } = handlers

  return subscribeSolicitudesCredito(
    (all) => {
      onMeta?.({
        totalFirestore: all.length,
        visiblesCola: all.filter((it) => solicitudParaCola(it, codigo, agencia)).length,
        visiblesCartera: all.filter((it) => solicitudParaCartera(it, codigo, agencia)).length,
        codigo,
        agencia
      })

      const cola = all
        .filter((it) => solicitudParaCola(it, codigo, agencia))
        .map((it) => ({ ...it, estado: ESTADO_PENDIENTE }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

      const cartera = all
        .filter((it) => solicitudParaCartera(it, codigo, agencia))
        .map((it) =>
          mapCarteraItem(it.solicitudId, {
            expediente: it.expediente,
            documentoCliente: it.documentoCliente,
            nombreCliente: it.nombreCliente,
            tipoGestion: it.tipoGestion || 'NUEVA_SOLICITUD',
            estado: it.estado === 'enviado' ? 'recibido_core' : it.estado,
            monto: it.monto,
            createdAt: it.createdAt,
            visitaRegistrada: false,
            semaforo: 'AMARILLO',
            canalCliente: it.canal === 'cliente'
          })
        )
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

      onCola?.(cola)
      onCartera?.(cartera)
    },
    onError
  )
}

function mergeCarteraItems(carteraItems, solicitudItems, asesorCodigo, agenciaId) {
  const ids = new Set(carteraItems.map((it) => it.solicitudId))
  const codigo = normalizeCodigo(asesorCodigo)

  const desdeSolicitudes = solicitudItems
    .filter((it) => !ids.has(it.solicitudId))
    .filter((it) => solicitudParaCartera(it, codigo, agenciaId))
    .map((it) =>
      mapCarteraItem(it.solicitudId, {
        expediente: it.expediente,
        documentoCliente: it.documentoCliente,
        nombreCliente: it.nombreCliente,
        tipoGestion: it.tipoGestion || 'NUEVA_SOLICITUD',
        estado: it.estado === 'enviado' ? 'recibido_core' : it.estado,
        monto: it.monto,
        createdAt: it.createdAt,
        visitaRegistrada: false,
        semaforo: 'AMARILLO',
        canalCliente: it.canal === 'cliente'
      })
    )

  return [...carteraItems, ...desdeSolicitudes].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  )
}

function mapColaItem(id, data, source = 'core') {
  return {
    solicitudId: id,
    expediente: data.expediente || '',
    estado: data.estado || '',
    agenciaId: data.agenciaId || AGENCIA_DEFAULT,
    asesorCodigo: data.asesorCodigo || '',
    createdAt: data.createdAt || 0,
    documentoCliente: data.documentoCliente || '',
    nombreCliente: data.nombreCliente || '',
    monto: Number(data.monto) || 0,
    canal: data.canal || (source === 'cliente' ? 'cliente' : ''),
    source
  }
}

function perteneceAgencia(item, agenciaId) {
  const agencia = (agenciaId || AGENCIA_DEFAULT).trim()
  const itemAgencia = (item.agenciaId || AGENCIA_DEFAULT).trim()
  return !itemAgencia || itemAgencia === agencia
}

function mergeColaItems(coreItems, solicitudItems, agenciaId, asesorCodigo) {
  const coreIds = new Set(coreItems.map((it) => it.solicitudId))
  const pendientesCore = coreItems.filter((it) => it.estado === ESTADO_PENDIENTE)

  const desdeSolicitudes = solicitudItems
    .filter((it) => !coreIds.has(it.solicitudId))
    .filter((it) => solicitudParaCola(it, asesorCodigo, agenciaId))
    .map((it) => ({ ...it, estado: ESTADO_PENDIENTE }))

  return [...pendientesCore, ...desdeSolicitudes].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  )
}

export function observeCartera(asesorCodigo, agenciaId, callback, onError) {
  return observeExpedientesEmp(asesorCodigo, agenciaId, {
    onCartera: callback,
    onError
  })
}

export function observeCola(agenciaId, asesorCodigo, callback, onError) {
  return observeExpedientesEmp(asesorCodigo, agenciaId, {
    onCola: callback,
    onError
  })
}

export function observeSolicitud(solicitudId, callback) {
  return onSnapshot(
    doc(db, COL_SOLICITUDES, solicitudId),
    (snap) => {
      if (!snap.exists()) {
        callback(null)
        return
      }
      callback(mapSolicitud(snap.id, snap.data()))
    },
    () => callback(null)
  )
}

export async function tomarDeCola(solicitudId, asesorCodigo, agenciaId) {
  const codigo = asesorCodigo.trim().toUpperCase()
  const now = Date.now()
  const solicitudRef = doc(db, COL_SOLICITUDES, solicitudId)
  const colaRef = doc(db, COL_CORE_COLA, solicitudId)
  const carteraRef = doc(db, COL_CARTERA_DIA, codigo, COL_ITEMS, solicitudId)

  const solicitudSnap = await getDoc(solicitudRef)
  if (!solicitudSnap.exists()) throw new Error('Solicitud no encontrada.')
  const data = solicitudSnap.data()
  const monto = Number(data.monto) || 0

  const batch = writeBatch(db)
  batch.update(solicitudRef, {
    estado: ESTADOS.EN_CARTERA_ASESOR,
    asesorCodigo: codigo,
    agenciaId,
    updatedAt: now
  })

  const colaSnap = await getDoc(colaRef)
  if (colaSnap.exists()) {
    batch.update(colaRef, { estado: ESTADO_ASIGNADO, asesorCodigo: codigo })
  } else {
    batch.set(colaRef, {
      solicitudId,
      expediente: data.expediente || '',
      estado: ESTADO_ASIGNADO,
      agenciaId,
      asesorCodigo: codigo,
      createdAt: data.createdAt || now
    })
  }

  batch.set(carteraRef, {
    solicitudId,
    expediente: data.expediente || '',
    documentoCliente: data.documentoCliente || '',
    nombreCliente: data.nombreCliente || '',
    tipoGestion: data.tipoGestion || 'NUEVA_SOLICITUD',
    estado: ESTADOS.EN_CARTERA_ASESOR,
    monto,
    createdAt: now,
    visitaRegistrada: false,
    semaforo: 'AMARILLO'
  })
  await batch.commit()
}

async function actualizarEstado(solicitudId, asesorCodigo, nuevoEstado, extraSolicitud = {}) {
  const codigo = asesorCodigo.trim().toUpperCase()
  const now = Date.now()
  const solicitudRef = doc(db, COL_SOLICITUDES, solicitudId)
  const carteraRef = doc(db, COL_CARTERA_DIA, codigo, COL_ITEMS, solicitudId)

  const updates = { estado: nuevoEstado, updatedAt: now, ...extraSolicitud }
  const carteraUpdates = {
    estado: nuevoEstado,
    visitaRegistrada: ordenEstado(nuevoEstado) >= ordenEstado(ESTADOS.VISITADO)
  }
  if (extraSolicitud.ficha?.semaforo) {
    carteraUpdates.semaforo = extraSolicitud.ficha.semaforo
  }

  const batch = writeBatch(db)
  batch.update(solicitudRef, updates)
  batch.update(carteraRef, carteraUpdates)
  await batch.commit()
}

function ordenEstado(estado) {
  const map = {
    enviado: 1,
    recibido_core: 2,
    en_cartera_asesor: 3,
    visitado: 4,
    pre_evaluacion_ok: 5,
    documentos_firmados: 6,
    promovido_nucleo: 7
  }
  return map[estado] || 0
}

export async function registrarVisita(solicitudId, asesorCodigo, observacion, latitud, longitud) {
  await actualizarEstado(solicitudId, asesorCodigo, ESTADOS.VISITADO, {
    visita: {
      visitado: true,
      observacion,
      latitud,
      longitud,
      fecha: fechaActual()
    }
  })
}

export async function guardarFicha(solicitudId, asesorCodigo, ficha) {
  await actualizarEstado(solicitudId, asesorCodigo, ESTADOS.EN_CARTERA_ASESOR, {
    ficha: fichaToMap(ficha)
  })
}

export async function registrarPreEvaluacion(solicitudId, asesorCodigo, pre) {
  await actualizarEstado(solicitudId, asesorCodigo, ESTADOS.PRE_EVALUACION_OK, {
    preEvaluacion: preEvalToMap(pre)
  })
}

export async function guardarBuro(solicitudId, asesorCodigo, buro) {
  await actualizarEstado(solicitudId, asesorCodigo, ESTADOS.PRE_EVALUACION_OK, {
    consultaBuro: buroToMap(buro)
  })
}

export async function guardarSimulacionYFirma(solicitudId, asesorCodigo, simulacion, firmaCapturada) {
  await actualizarEstado(solicitudId, asesorCodigo, ESTADOS.DOCUMENTOS_FIRMADOS, {
    simulacion: simulacionToMap(simulacion),
    firmaCapturada,
    documentos: [
      { tipo: 'CONSENTIMIENTO_BURO', url: 'local://consent', nombre: 'Consentimiento_firmado.pdf' },
      { tipo: 'CRONOGRAMA', url: 'local://cronograma', nombre: 'Cronograma_RF47.pdf' }
    ]
  })
}

export async function promoverAComite(solicitudId, asesorCodigo) {
  await actualizarEstado(solicitudId, asesorCodigo, ESTADOS.PROMOVIDO_NUCLEO, {})
}

/** Elimina solicitud y referencias en core_cola / cartera_dia (solo administrador en Firestore). */
export async function borrarExpediente(solicitudId) {
  const solicitudRef = doc(db, COL_SOLICITUDES, solicitudId)
  const solicitudSnap = await getDoc(solicitudRef)
  if (!solicitudSnap.exists()) throw new Error('Expediente no encontrado.')

  const data = solicitudSnap.data()
  const batch = writeBatch(db)
  batch.delete(solicitudRef)
  batch.delete(doc(db, COL_CORE_COLA, solicitudId))

  const asesor = normalizeCodigo(data.asesorCodigo)
  if (asesor) {
    batch.delete(doc(db, COL_CARTERA_DIA, asesor, COL_ITEMS, solicitudId))
  }

  await batch.commit()
}

async function generarExpediente() {
  const anio = new Date().getFullYear()
  const counterRef = doc(db, COL_CONTADORES, 'expedientes')
  const numero = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const ultimoAnio = snap.exists() ? snap.data().anio : anio
    const ultimo = ultimoAnio === anio ? (snap.data().ultimo || 0) + 1 : 1
    tx.set(counterRef, { anio, ultimo })
    return ultimo
  })
  return `EXP-${anio}-${String(numero).padStart(5, '0')}`
}

export async function registrarOriginacionCampo(payload) {
  const {
    asesorCodigo,
    agenciaId,
    documento,
    nombre,
    monto,
    plazoMeses,
    destino,
    garantia,
    ficha,
    buro,
    preEvaluacion,
    simulacion,
    visita
  } = payload
  const codigo = asesorCodigo.trim().toUpperCase()
  const now = Date.now()
  const expediente = await generarExpediente()
  const ref = doc(collection(db, COL_SOLICITUDES))

  await setDoc(ref, {
    expediente,
    clienteUid: '',
    documentoCliente: documento,
    nombreCliente: nombre,
    monto,
    plazoMeses,
    destino,
    garantia,
    canal: 'fuerza_ventas',
    estado: ESTADOS.DOCUMENTOS_FIRMADOS,
    agenciaId,
    asesorCodigo: codigo,
    tipoGestion: 'NUEVA_SOLICITUD',
    visita: visitaToMap(visita),
    preEvaluacion: preEvalToMap(preEvaluacion),
    ficha: fichaToMap(ficha),
    consultaBuro: buroToMap(buro),
    simulacion: simulacionToMap(simulacion),
    firmaCapturada: true,
    documentos: [
      { tipo: 'DNI', url: 'local://dni', nombre: 'DNI_campo.jpg' },
      { tipo: 'CONSENTIMIENTO_BURO', url: 'local://consent', nombre: 'Consentimiento.pdf' }
    ],
    createdAt: now,
    updatedAt: now
  })

  await setDoc(doc(db, COL_CARTERA_DIA, codigo, COL_ITEMS, ref.id), {
    solicitudId: ref.id,
    expediente,
    documentoCliente: documento,
    nombreCliente: nombre,
    tipoGestion: 'NUEVA_SOLICITUD',
    estado: ESTADOS.DOCUMENTOS_FIRMADOS,
    monto,
    createdAt: now,
    visitaRegistrada: true,
    semaforo: ficha.semaforo
  })

  return { id: ref.id, expediente }
}

function fichaToMap(f) {
  return {
    documento: f.documento,
    nombre: f.nombre,
    direccion: f.direccion,
    latitud: f.latitud,
    longitud: f.longitud,
    semaforo: f.semaforo,
    ofertaMonto: f.ofertaMonto,
    ofertaPlazoMeses: f.ofertaPlazoMeses,
    ingresoEstimado: f.ingresoEstimado,
    elegible: f.elegible,
    motivoElegibilidad: f.motivoElegibilidad
  }
}

function buroToMap(b) {
  return {
    sbsCalificacion: b.sbsCalificacion,
    sbsPuntaje: b.sbsPuntaje,
    listaNegra: b.listaNegra,
    consentimientoFirmado: b.consentimientoFirmado,
    fechaConsulta: b.fechaConsulta,
    observacion: b.observacion
  }
}

function simulacionToMap(s) {
  return {
    monto: s.monto,
    plazoMeses: s.plazoMeses,
    tea: s.tea,
    cuotaMensual: s.cuotaMensual,
    totalPagar: s.totalPagar,
    cronograma: (s.cronograma || []).map((c) => ({
      numero: c.numero,
      fechaVencimiento: c.fechaVencimiento,
      capital: c.capital,
      interes: c.interes,
      cuota: c.cuota,
      saldo: c.saldo
    }))
  }
}

function visitaToMap(v) {
  return {
    visitado: v.visitado,
    observacion: v.observacion,
    latitud: v.latitud,
    longitud: v.longitud,
    fecha: v.fecha
  }
}

function preEvalToMap(p) {
  return {
    capacidadPagoOk: p.capacidadPagoOk,
    buroOk: p.buroOk,
    listasOk: p.listasOk,
    resultadoEsperado: p.resultadoEsperado,
    resultadoObtenido: p.resultadoObtenido,
    fecha: p.fecha
  }
}

function mapSolicitud(id, data) {
  const visitaMap = data.visita || {}
  const preMap = data.preEvaluacion || {}
  const fichaMap = data.ficha || {}
  const buroMap = data.consultaBuro || {}
  const simMap = data.simulacion || {}
  return {
    id,
    expediente: data.expediente || '',
    documentoCliente: data.documentoCliente || '',
    nombreCliente: data.nombreCliente || '',
    monto: Number(data.monto) || 0,
    plazoMeses: Number(data.plazoMeses) || 0,
    destino: data.destino || '',
    garantia: data.garantia || '',
    estado: data.estado || '',
    visita: {
      visitado: !!visitaMap.visitado,
      observacion: visitaMap.observacion || '',
      latitud: Number(visitaMap.latitud) || 0,
      longitud: Number(visitaMap.longitud) || 0,
      fecha: visitaMap.fecha || ''
    },
    preEvaluacion: {
      capacidadPagoOk: !!preMap.capacidadPagoOk,
      buroOk: !!preMap.buroOk,
      listasOk: !!preMap.listasOk,
      resultadoEsperado: preMap.resultadoEsperado || '',
      resultadoObtenido: preMap.resultadoObtenido || '',
      fecha: preMap.fecha || ''
    },
    ficha: {
      documento: fichaMap.documento || '',
      nombre: fichaMap.nombre || '',
      semaforo: fichaMap.semaforo || 'AMARILLO',
      elegible: !!fichaMap.elegible,
      motivoElegibilidad: fichaMap.motivoElegibilidad || ''
    },
    consultaBuro: {
      sbsCalificacion: buroMap.sbsCalificacion || '',
      sbsPuntaje: Number(buroMap.sbsPuntaje) || 0,
      listaNegra: !!buroMap.listaNegra,
      fechaConsulta: buroMap.fechaConsulta || ''
    },
    simulacion: {
      monto: Number(simMap.monto) || 0,
      plazoMeses: Number(simMap.plazoMeses) || 0,
      tea: Number(simMap.tea) || 0,
      cuotaMensual: Number(simMap.cuotaMensual) || 0,
      totalPagar: Number(simMap.totalPagar) || 0,
      cronograma: simMap.cronograma || []
    },
    firmaCapturada: !!data.firmaCapturada
  }
}

export function pasoDesdeEstado(s) {
  if (!s) return 0
  switch (s.estado) {
    case ESTADOS.EN_CARTERA_ASESOR:
    case 'recibido_core':
      return s.ficha?.documento ? 1 : 0
    case ESTADOS.VISITADO:
      return 2
    case ESTADOS.PRE_EVALUACION_OK:
      return s.consultaBuro?.fechaConsulta ? 4 : 3
    case ESTADOS.DOCUMENTOS_FIRMADOS:
      return 5
    case ESTADOS.PROMOVIDO_NUCLEO:
      return 5
    default:
      return 0
  }
}
