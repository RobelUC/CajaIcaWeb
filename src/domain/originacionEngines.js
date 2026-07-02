import casosData from '../data/casos30.json'
import { getCasoPorDocumento, teaParaCaso } from './casosPractica'

export const TEA_CON_SEGURO = 0.4092
export const TEA_SIN_SEGURO = 0.4392

function round2(n) {
  return Math.round(n * 100) / 100
}

export function simularCronograma(monto, plazoMeses, tea = TEA_SIN_SEGURO, opts = {}) {
  if (monto <= 0 || plazoMeses <= 0) {
    return { monto: 0, plazoMeses: 0, tea: 0, cuotaMensual: 0, totalPagar: 0, cronograma: [] }
  }
  const tem = Math.pow(1 + tea, 1 / 12) - 1
  const cuotaRaw =
    tem === 0
      ? monto / plazoMeses
      : (monto * tem * Math.pow(1 + tem, plazoMeses)) / (Math.pow(1 + tem, plazoMeses) - 1)
  const cuota = round2(cuotaRaw)

  const { fechaDesembolso, diaPagoMes } = opts
  let cal = new Date()
  if (fechaDesembolso) {
    const [d, m, y] = fechaDesembolso.split('/').map(Number)
    if (d && m && y) cal = new Date(y, m - 1, d)
  }
  const fmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  let saldo = monto
  const cuotas = []

  for (let i = 0; i < plazoMeses; i++) {
    const interes = round2(saldo * tem)
    let capital = round2(cuota - interes)
    if (i === plazoMeses - 1) {
      capital = round2(saldo)
      saldo = 0
    } else {
      saldo = round2(Math.max(0, saldo - capital))
    }
    cal.setMonth(cal.getMonth() + 1)
    if (diaPagoMes) cal.setDate(Math.min(diaPagoMes, 28))
    cuotas.push({
      numero: i + 1,
      fechaVencimiento: fmt.format(cal),
      capital,
      interes,
      cuota,
      saldo
    })
  }

  return {
    monto,
    plazoMeses,
    tea: round2(tea * 100),
    cuotaMensual: cuota,
    totalPagar: round2(cuota * plazoMeses),
    cronograma: cuotas
  }
}

export function consultarBuro(documento, consentimientoFirmado) {
  const digits = documento.replace(/\D/g, '')
  const caso = getCasoPorDocumento(digits)

  if (caso) {
    const b = caso.buro
    return {
      sbsCalificacion: b.calificacion,
      sbsPuntaje: caso.preEvaluacion.puntaje,
      entidadesConDeuda: b.entidadesConDeuda,
      deudaTotal: b.deudaTotal,
      diasMoraMax: b.diasMoraMax,
      listaNegra: b.listaInhabilitados,
      listaInhabilitados: b.listaInhabilitados,
      consentimientoFirmado,
      fechaConsulta: new Date().toLocaleString('es-PE'),
      observacion: b.listaInhabilitados
        ? 'Cliente en lista de inhabilitados del sistema financiero'
        : `Buró simulado — ${b.calificacion}, ${b.entidadesConDeuda} entidad(es), deuda S/ ${b.deudaTotal.toFixed(2)}`,
      bloqueaFlujo: b.bloqueaEnPaso5,
      casoId: caso.id
    }
  }

  const ultimo = digits.length ? parseInt(digits.slice(-1), 10) : 5
  const listaNegra = ultimo === 0
  const puntaje = listaNegra ? 320 : ultimo <= 3 ? 780 : ultimo <= 6 ? 650 : 520
  const calificacion = listaNegra ? 'PERDIDA' : puntaje >= 750 ? 'NORMAL' : puntaje >= 600 ? 'NORMAL' : puntaje >= 500 ? 'CPP' : 'DEFICIENTE'
  return {
    sbsCalificacion: calificacion,
    sbsPuntaje: puntaje,
    entidadesConDeuda: ultimo % 3,
    deudaTotal: ultimo * 1500,
    diasMoraMax: ultimo === 0 ? 210 : ultimo <= 2 ? 0 : 15,
    listaNegra,
    listaInhabilitados: listaNegra,
    consentimientoFirmado,
    fechaConsulta: new Date().toLocaleString('es-PE'),
    observacion: listaNegra ? 'Cliente en lista de inhabilitados' : 'Consulta SBS simulada OK',
    bloqueaFlujo: listaNegra
  }
}

export function historialDemo(documento) {
  if (documento.length < 8) return []
  const caso = getCasoPorDocumento(documento)
  if (!caso) {
    return [
      { expediente: 'EXP-2024-00123', monto: 5000, estado: 'desembolsado', fecha: '15/03/2024' },
      { expediente: 'EXP-2025-00456', monto: 3000, estado: 'aprobado', fecha: '10/01/2025' }
    ]
  }
  return []
}

export function construirFicha({ documento, nombre, monto, plazoMeses, ingresoMensual, gastoMensual = 0, lat, lng, historial = [] }) {
  const caso = getCasoPorDocumento(documento)
  const ingreso = caso?.negocio.ingresoMensual ?? ingresoMensual
  const gasto = caso?.negocio.gastoMensual ?? gastoMensual
  const m = caso?.solicitud.monto ?? monto
  const p = caso?.solicitud.plazoMeses ?? plazoMeses
  const tea = caso ? teaParaCaso(caso) : TEA_SIN_SEGURO
  const sim = simularCronograma(m, p, tea)
  const disponible = Math.max(0, ingreso - gasto)
  const ratio = ingreso > 0 ? sim.cuotaMensual / ingreso : 1
  const ratioDisponible = disponible > 0 ? sim.cuotaMensual / disponible : 2

  let semaforo = 'VERDE'
  if (ratio > 0.45 || ratioDisponible > 0.7) semaforo = 'ROJO'
  else if (ratio > 0.3 || ratioDisponible > 0.5) semaforo = 'AMARILLO'

  const antiguedad = caso?.negocio.antiguedadMeses ?? 36
  let elegible = semaforo !== 'ROJO' && documento.length >= 8
  if (caso?.preEvaluacion.resultado === 'NO_PROCEDE') elegible = false

  return {
    documento,
    nombre: caso?.cliente.nombre ?? nombre,
    direccion: caso ? `${caso.negocio.nombre}, ${caso.negocio.ubicacion}` : `Ubicación campo (${lat}, ${lng})`,
    latitud: caso?.asesor.visita.lat ?? lat,
    longitud: caso?.asesor.visita.lng ?? lng,
    semaforo,
    historial,
    ofertaMonto: m,
    ofertaPlazoMeses: p,
    ingresoEstimado: ingreso,
    gastoEstimado: gasto,
    antiguedadMeses: antiguedad,
    elegible,
    motivoElegibilidad: !elegible
      ? caso?.preEvaluacion.resultado === 'NO_PROCEDE'
        ? 'Capacidad de pago insuficiente — NO_PROCEDE'
        : 'Capacidad de pago insuficiente o riesgo alto'
      : semaforo === 'VERDE'
        ? 'Sujeto de crédito elegible — riesgo bajo'
        : 'Elegible con seguimiento — riesgo medio',
    casoId: caso?.id ?? null
  }
}

export function evaluarPreEvaluacion(ficha, buro) {
  const caso = getCasoPorDocumento(ficha.documento)
  const esperado = caso?.preEvaluacion.resultado ?? 'APTO'

  if (buro.bloqueaFlujo || buro.listaInhabilitados) {
    return {
      capacidadPagoOk: false,
      buroOk: false,
      listasOk: false,
      resultadoEsperado: esperado,
      resultadoObtenido: 'BLOQUEADO_BURO',
      puntaje: caso?.preEvaluacion.puntaje ?? 0,
      fecha: new Date().toLocaleString('es-PE'),
      observacion: 'Bloqueado en consulta de buró (lista de inhabilitados)'
    }
  }

  if (esperado === 'NO_PROCEDE') {
    return {
      capacidadPagoOk: false,
      buroOk: buro.sbsCalificacion !== 'PERDIDA',
      listasOk: !buro.listaInhabilitados,
      resultadoEsperado: 'NO_PROCEDE',
      resultadoObtenido: 'NO_PROCEDE',
      puntaje: caso?.preEvaluacion.puntaje ?? 60,
      fecha: new Date().toLocaleString('es-PE'),
      observacion: 'Monto solicitado supera capacidad de pago estimada'
    }
  }

  const capacidad = ficha.elegible
  const buroOk = !['PERDIDA', 'DUDOSO'].includes(buro.sbsCalificacion) || caso?.comite.decision === 'APROBADO'
  const listasOk = !buro.listaInhabilitados
  const aprobado = capacidad && buroOk && listasOk

  return {
    capacidadPagoOk: capacidad,
    buroOk,
    listasOk,
    resultadoEsperado: esperado,
    resultadoObtenido: aprobado ? 'APTO' : 'REVISAR',
    puntaje: caso?.preEvaluacion.puntaje ?? (aprobado ? 85 : 60),
    fecha: new Date().toLocaleString('es-PE'),
    observacion: aprobado ? 'Pre-evaluación favorable' : 'Requiere revisión adicional'
  }
}

export function decisionComiteEsperada(documento) {
  const caso = getCasoPorDocumento(documento)
  if (!caso) return null
  return {
    decision: caso.comite.decision,
    montoAprobado: caso.comite.montoAprobado,
    motivoCondicion: caso.comite.motivoCondicion,
    motivoRechazo: caso.comite.motivoRechazo,
    desembolso: caso.desembolso
  }
}

export function simularParaCaso(casoId, montoAprobadoOverride = null) {
  const caso = casosData.casos.find((c) => c.id === casoId)
  if (!caso) return null
  const monto = montoAprobadoOverride ?? caso.comite.montoAprobado ?? caso.solicitud.monto
  const tea = teaParaCaso(caso)
  return simularCronograma(monto, caso.solicitud.plazoMeses, tea, {
    fechaDesembolso: caso.desembolso?.fecha,
    diaPagoMes: caso.desembolso?.diaPagoMes
  })
}
