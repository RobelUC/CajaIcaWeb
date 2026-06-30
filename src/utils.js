const ESTADOS = {
  promovido_nucleo: { label: 'Promovido al núcleo', className: 'badge-purple' },
  recibido_comite: { label: 'Recibido comité', className: 'badge-gold' },
  en_evaluacion: { label: 'En evaluación', className: 'badge-blue' },
  aprobado: { label: 'Aprobado', className: 'badge-green' },
  condicionado: { label: 'Condicionado', className: 'badge-orange' },
  rechazado: { label: 'Rechazado', className: 'badge-red' },
  desembolsado: { label: 'Desembolsado', className: 'badge-green' },
  documentos_firmados: { label: 'Documentos firmados', className: 'badge-gray' },
  enviado: { label: 'Enviado', className: 'badge-gray' },
  recibido_core: { label: 'Recibido core', className: 'badge-gray' },
  en_cartera_asesor: { label: 'En cartera', className: 'badge-gray' },
  visitado: { label: 'Visitado', className: 'badge-gray' },
  pre_evaluacion_ok: { label: 'Pre-evaluación OK', className: 'badge-gray' },
  cerrado: { label: 'Cerrado', className: 'badge-gray' }
}

export function etiquetaEstado(estado) {
  return ESTADOS[estado]?.label ?? estado?.replaceAll('_', ' ') ?? '—'
}

export function claseEstado(estado) {
  return ESTADOS[estado]?.className ?? 'badge-gray'
}

export function formatSoles(value) {
  const n = Number(value) || 0
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatFecha(ts) {
  if (!ts) return '—'
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
  return d.toLocaleDateString('es-PE')
}

export function fechaActual() {
  return new Date().toLocaleString('es-PE')
}

export function montoAprobado(solicitud) {
  return solicitud?.desembolso?.monto ?? solicitud?.monto ?? 0
}

export function semaforoColor(semaforo) {
  switch (semaforo) {
    case 'VERDE':
      return '#2e7d32'
    case 'ROJO':
      return '#c62828'
    default:
      return '#f9a825'
  }
}

export const PASOS_ORIGINACION = [
  { id: 0, label: 'Ficha' },
  { id: 1, label: 'Visita' },
  { id: 2, label: 'Pre-eval' },
  { id: 3, label: 'Buró' },
  { id: 4, label: 'RF-47' },
  { id: 5, label: 'Transmitir' }
]
