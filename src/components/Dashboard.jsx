import { useEffect, useMemo, useState } from 'react'
import { Plus, CheckCircle2 } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import CarteraPanel from './CarteraPanel'
import ColaPanel from './ColaPanel'
import ReportesPanel from './ReportesPanel'
import PerfilPanel from './PerfilPanel'
import OriginacionStepper from './OriginacionStepper'
import { observeExpedientesEmp, tomarDeCola, borrarExpediente } from '../services/ventasService'
import { AGENCIA_DEFAULT, obtenerPerfil } from '../services/asesorService'
import { FILTROS, ORDENES } from '../domain/carteraFilters'
import { canViewReportes, canDeleteExpediente } from '../security/rbac'

export default function Dashboard({ operador, onLogout }) {
  const [activeTab, setActiveTab] = useState('cartera')
  const [menuOpen, setMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const [asesor, setAsesor] = useState(null)
  const [cartera, setCartera] = useState([])
  const [cola, setCola] = useState([])
  const [loadingCartera, setLoadingCartera] = useState(true)
  const [loadingCola, setLoadingCola] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [syncError, setSyncError] = useState('')
  const [syncMeta, setSyncMeta] = useState(null)
  const [filtro, setFiltro] = useState(FILTROS.TODOS)
  const [orden, setOrden] = useState(ORDENES.FECHA_DESC)
  const [originacionId, setOriginacionId] = useState(undefined)

  const showOriginacion = originacionId !== undefined

  useEffect(() => {
    obtenerPerfil(operador.codigo).then(setAsesor)
  }, [operador.codigo])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const codigoEmp = operador.codigo
  const agenciaEmp = asesor?.agenciaId || AGENCIA_DEFAULT

  useEffect(() => {
    setLoadingCartera(true)
    setLoadingCola(true)
    setSyncError('')
    const unsub = observeExpedientesEmp(codigoEmp, agenciaEmp, {
      onCartera: (items) => {
        setCartera(items)
        setLoadingCartera(false)
      },
      onCola: (items) => {
        setCola(items)
        setLoadingCola(false)
      },
      onMeta: setSyncMeta,
      onError: (err) => {
        const msg =
          err?.code === 'permission-denied'
            ? `Firestore bloqueó la lectura para ${codigoEmp}. Republica firestore.rules y verifica que el usuario sea @ventas.cmacica.pe`
            : err?.message || 'Error al sincronizar expedientes.'
        setSyncError(msg)
        setLoadingCartera(false)
        setLoadingCola(false)
      }
    })
    return unsub
  }, [codigoEmp, agenciaEmp])

  useEffect(() => {
    if (activeTab === 'reportes' && !canViewReportes(operador.rol)) {
      setActiveTab('cartera')
    }
  }, [activeTab, operador.rol])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const stats = useMemo(
    () => ({
      cartera: cartera.length,
      cola: cola.length
    }),
    [cartera, cola]
  )

  async function handleTomar(solicitudId) {
    setActionLoading(true)
    try {
      await tomarDeCola(solicitudId, codigoEmp, agenciaEmp)
      setToast('Solicitud asignada a tu cartera')
    } catch (e) {
      setToast(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleBorrarExpediente(solicitudId, expediente) {
    const label = expediente || solicitudId
    if (!window.confirm(`¿Eliminar el expediente ${label}? Esta acción no se puede deshacer.`)) return
    setActionLoading(true)
    try {
      await borrarExpediente(solicitudId)
      if (originacionId === solicitudId) closeOriginacion()
      setToast(`Expediente ${label} eliminado`)
    } catch (e) {
      setToast(e.message || 'No se pudo eliminar el expediente')
    } finally {
      setActionLoading(false)
    }
  }

  const puedeBorrar = canDeleteExpediente(operador.rol)

  function openOriginacion(id = null) {
    setOriginacionId(id)
  }

  function closeOriginacion() {
    setOriginacionId(undefined)
    setActiveTab('cartera')
  }

  let content
  if (showOriginacion) {
    content = (
      <OriginacionStepper
        solicitudId={originacionId}
        asesor={asesor || { codigo: codigoEmp, agenciaId: agenciaEmp, nombre: codigoEmp, activo: true }}
        canDelete={puedeBorrar && !!originacionId}
        onBorrarExpediente={handleBorrarExpediente}
        onBack={closeOriginacion}
        onDone={() => {
          setToast('Expediente transmitido al comité')
          closeOriginacion()
        }}
      />
    )
  } else if (activeTab === 'cartera') {
    content = (
      <CarteraPanel
        items={cartera}
        filtro={filtro}
        orden={orden}
        onFiltroChange={setFiltro}
        onOrdenChange={setOrden}
        onOpenExpediente={(id) => openOriginacion(id)}
        onBorrarExpediente={handleBorrarExpediente}
        canDelete={puedeBorrar}
        deleteLoading={actionLoading}
        loading={loadingCartera}
        stats={stats}
      />
    )
  } else if (activeTab === 'cola') {
    content = (
      <ColaPanel
        items={cola}
        onTomar={handleTomar}
        onBorrarExpediente={handleBorrarExpediente}
        canDelete={puedeBorrar}
        loading={loadingCola}
        actionLoading={actionLoading}
      />
    )
  } else if (activeTab === 'reportes') {
    content = <ReportesPanel role={operador.rol} />
  } else if (activeTab === 'perfil') {
    content = <PerfilPanel operador={operador} asesor={asesor} onLogout={onLogout} />
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={showOriginacion ? 'cartera' : activeTab}
        stats={stats}
        onNavigate={setActiveTab}
        role={operador.rol}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="main-area">
        <TopBar
          operador={operador}
          asesor={asesor}
          hora={now}
          onLogout={onLogout}
          onProfile={() => setActiveTab('perfil')}
          onMenuToggle={() => setMenuOpen(true)}
          onNuevaOriginacion={() => openOriginacion(null)}
        />
        {syncError ? (
          <div className="toast-banner toast-error">{syncError}</div>
        ) : null}
        {!syncError && syncMeta && syncMeta.totalFirestore === 0 && !loadingCartera ? (
          <div className="toast-banner toast-error">
            Firestore devolvió 0 solicitudes para {codigoEmp}. Crea una desde la app cliente o revisa el proyecto
            Firebase cajaica.
          </div>
        ) : null}
        {!syncError && syncMeta && syncMeta.totalFirestore > 0 && cartera.length === 0 && cola.length === 0 ? (
          <div className="toast-banner toast-error">
            Hay {syncMeta.totalFirestore} solicitud(es) en Firestore pero ninguna en estado enviado/recibido_core
            para tu agencia. El Comité puede verlas porque lee todos los estados (ej. promovido_nucleo).
          </div>
        ) : null}
        {toast && (
          <div className="toast-banner">
            <CheckCircle2 size={18} />
            {toast}
          </div>
        )}
        {content}
        {!showOriginacion && activeTab === 'cartera' ? (
          <button
            type="button"
            className="fab-mobile"
            onClick={() => openOriginacion(null)}
            aria-label="Nueva originación"
          >
            <Plus size={24} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
