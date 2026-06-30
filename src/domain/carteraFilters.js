export const FILTROS = {
  TODOS: 'todos',
  PENDIENTE_VISITA: 'pendiente_visita',
  EN_GESTION: 'en_gestion',
  LISTO_COMITE: 'listo_comite'
}

export const ORDENES = {
  FECHA_DESC: 'fecha_desc',
  MONTO_DESC: 'monto_desc',
  MONTO_ASC: 'monto_asc',
  NOMBRE_ASC: 'nombre_asc'
}

export function filtrarCartera(items, filtro) {
  switch (filtro) {
    case FILTROS.PENDIENTE_VISITA:
      return items.filter(
        (it) => ['recibido_core', 'en_cartera_asesor'].includes(it.estado) && !it.visitaRegistrada
      )
    case FILTROS.EN_GESTION:
      return items.filter((it) => ['visitado', 'pre_evaluacion_ok', 'documentos_firmados'].includes(it.estado))
    case FILTROS.LISTO_COMITE:
      return items.filter((it) => ['documentos_firmados', 'promovido_nucleo'].includes(it.estado))
    default:
      return items
  }
}

export function ordenarCartera(items, orden) {
  const copy = [...items]
  switch (orden) {
    case ORDENES.MONTO_DESC:
      return copy.sort((a, b) => b.monto - a.monto)
    case ORDENES.MONTO_ASC:
      return copy.sort((a, b) => a.monto - b.monto)
    case ORDENES.NOMBRE_ASC:
      return copy.sort((a, b) => a.nombreCliente.localeCompare(b.nombreCliente, 'es'))
    default:
      return copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }
}
