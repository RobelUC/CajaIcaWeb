const TEA_DEFAULT = 0.28

export function simularCronograma(monto, plazoMeses, tea = TEA_DEFAULT) {
  if (monto <= 0 || plazoMeses <= 0) {
    return { monto: 0, plazoMeses: 0, tea: 0, cuotaMensual: 0, totalPagar: 0, cronograma: [] }
  }
  const tem = Math.pow(1 + tea, 1 / 12) - 1
  const cuota =
    tem === 0
      ? monto / plazoMeses
      : (monto * tem * Math.pow(1 + tem, plazoMeses)) / (Math.pow(1 + tem, plazoMeses) - 1)

  let saldo = monto
  const cal = new Date()
  const fmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const cuotas = []

  for (let i = 0; i < plazoMeses; i++) {
    const interes = saldo * tem
    const capital = cuota - interes
    saldo = Math.max(0, saldo - capital)
    cal.setMonth(cal.getMonth() + 1)
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
    tea: tea * 100,
    cuotaMensual: cuota,
    totalPagar: cuota * plazoMeses,
    cronograma: cuotas
  }
}

export function consultarBuro(documento, consentimientoFirmado) {
  const digits = documento.replace(/\D/g, '')
  const ultimo = digits.length ? parseInt(digits.slice(-1), 10) : 5
  const listaNegra = ultimo === 0
  const puntaje = listaNegra ? 320 : ultimo <= 3 ? 780 : ultimo <= 6 ? 650 : 520
  const calificacion = listaNegra ? 'E' : puntaje >= 750 ? 'A' : puntaje >= 600 ? 'B' : puntaje >= 500 ? 'C' : 'D'
  return {
    sbsCalificacion: calificacion,
    sbsPuntaje: puntaje,
    listaNegra,
    consentimientoFirmado,
    fechaConsulta: new Date().toLocaleString('es-PE'),
    observacion: listaNegra ? 'Cliente en lista negra interna' : 'Consulta SBS simulada OK'
  }
}

export function historialDemo(documento) {
  if (documento.length < 8) return []
  return [
    { expediente: 'EXP-2024-00123', monto: 5000, estado: 'desembolsado', fecha: '15/03/2024' },
    { expediente: 'EXP-2025-00456', monto: 3000, estado: 'aprobado', fecha: '10/01/2025' }
  ]
}

export function construirFicha({ documento, nombre, monto, plazoMeses, ingresoMensual, lat, lng, historial = [] }) {
  const sim = simularCronograma(monto, plazoMeses)
  const ratio = ingresoMensual > 0 ? sim.cuotaMensual / ingresoMensual : 1
  const semaforo =
    ratio <= 0.3 && !historial.some((h) => h.estado === 'rechazado')
      ? 'VERDE'
      : ratio <= 0.45
        ? 'AMARILLO'
        : 'ROJO'
  const elegible = semaforo !== 'ROJO' && documento.length >= 8
  return {
    documento,
    nombre,
    direccion: `Ubicación campo (${lat}, ${lng})`,
    latitud: lat,
    longitud: lng,
    semaforo,
    historial,
    ofertaMonto: monto,
    ofertaPlazoMeses: plazoMeses,
    ingresoEstimado: ingresoMensual,
    elegible,
    motivoElegibilidad: !elegible
      ? 'Capacidad de pago insuficiente o riesgo alto'
      : semaforo === 'VERDE'
        ? 'Sujeto de crédito elegible — riesgo bajo'
        : 'Elegible con seguimiento — riesgo medio'
  }
}

export function evaluarPreEvaluacion(ficha, buro) {
  const capacidad = ficha.elegible
  const buroOk = !buro.listaNegra && buro.sbsPuntaje >= 500
  const listasOk = !buro.listaNegra
  const aprobado = capacidad && (buro.fechaConsulta ? buroOk && listasOk : true)
  return {
    capacidadPagoOk: capacidad,
    buroOk,
    listasOk,
    resultadoEsperado: 'APROBADO',
    resultadoObtenido: aprobado ? 'APROBADO' : 'OBSERVADO',
    fecha: new Date().toLocaleString('es-PE')
  }
}
