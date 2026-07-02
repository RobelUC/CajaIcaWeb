import casosData from '../data/casos30.json'

const { casos, meta } = casosData

const byDocumento = new Map(casos.map((c) => [c.cliente.documento, c]))

export function getCasoPorDocumento(documento) {
  const d = (documento || '').replace(/\D/g, '')
  return byDocumento.get(d) || null
}

export function getCasoPorId(id) {
  return casos.find((c) => c.id === id) || null
}

export function listarCasos() {
  return casos
}

export function teaDecimal(conSeguro) {
  return conSeguro ? meta.teaConSeguro / 100 : meta.teaSinSeguro / 100
}

export function teaParaCaso(caso) {
  if (!caso) return meta.teaSinSeguro / 100
  return teaDecimal(caso.solicitud.conSeguroDesgravamen)
}

export { casos, meta }
