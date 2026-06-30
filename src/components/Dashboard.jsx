import { useEffect, useMemo, useState } from 'react'
import { Plus, CheckCircle2 } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import CarteraPanel from './CarteraPanel'
import ColaPanel from './ColaPanel'
import ReportesPanel from './ReportesPanel'
import PerfilPanel from './PerfilPanel'
import OriginacionStepper from './OriginacionStepper'
import { observeCartera, observeCola, tomarDeCola } from '../services/ventasService'
import { obtenerPerfil } from '../services/asesorService'
import { FILTROS, ORDENES } from '../domain/carteraFilters'
import { canViewReportes } from '../security/rbac'

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

  useEffect(() => {
    if (!asesor) return
    setLoadingCartera(true)
    const unsub = observeCartera(asesor.codigo, (items) => {
      setCartera(items)
      setLoadingCartera(false)
    })
    return unsub
  }, [asesor])

  useEffect(() => {
    if (!asesor) return
    setLoadingCola(true)
    const unsub = observeCola(asesor.agenciaId, (items) => {
      setCola(items)
      setLoadingCola(false)
    })
    return unsub
  }, [asesor])

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
    if (!asesor) return
    setActionLoading(true)
    try {
      await tomarDeCola(solicitudId, asesor.codigo, asesor.agenciaId)
      setToast('Solicitud asignada a tu cartera')
    } catch (e) {
      setToast(e.message)
    } finally {
      setActionLoading(false)
    }
  }

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
        asesor={asesor}
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
        loading={loadingCartera}
        stats={stats}
      />
    )
  } else if (activeTab === 'cola') {
    content = (
      <ColaPanel items={cola} onTomar={handleTomar} loading={loadingCola} actionLoading={actionLoading} />
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
