import { useEffect, useMemo, useState } from 'react'
import ComiteSidebar from './ComiteSidebar'
import ComiteTopBar from './ComiteTopBar'
import InicioPanel from './InicioPanel'
import EvaluacionPanel from './EvaluacionPanel'
import SolicitudesTable from './SolicitudesTable'
import PerfilPanel from '../PerfilPanel'
import { observeSolicitudes } from '../../services/comiteService'

export default function ComiteDashboard({ operador, onLogout }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [now, setNow] = useState(new Date())
  const [activeTab, setActiveTab] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)

  function navigate(tab) {
    setActiveTab(tab)
    setMenuOpen(false)
  }

  useEffect(() => {
    const unsub = observeSolicitudes(setSolicitudes)
    return unsub
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return solicitudes.filter((s) => {
      const matchEstado = filtroEstado === 'todos' || s.estado === filtroEstado
      const matchQ =
        !q ||
        s.expediente?.toLowerCase().includes(q) ||
        s.nombreCliente?.toLowerCase().includes(q) ||
        s.documentoCliente?.includes(q)
      return matchEstado && matchQ
    })
  }, [solicitudes, busqueda, filtroEstado])

  const stats = useMemo(
    () => ({
      comite: solicitudes.filter((s) =>
        ['promovido_nucleo', 'recibido_comite', 'en_evaluacion'].includes(s.estado)
      ).length,
      aprobados: solicitudes.filter((s) => s.estado === 'aprobado').length,
      total: solicitudes.length,
      evaluacion: solicitudes.filter((s) =>
        ['promovido_nucleo', 'recibido_comite', 'en_evaluacion'].includes(s.estado)
      ).length
    }),
    [solicitudes]
  )

  function renderContent() {
    if (activeTab === 'inicio') {
      return (
        <InicioPanel
          operador={operador}
          stats={stats}
          solicitudes={solicitudes}
          onNavigate={navigate}
        />
      )
    }

    if (activeTab === 'evaluacion') {
      return <EvaluacionPanel solicitudes={solicitudes} />
    }

    if (activeTab === 'perfil') {
      return <PerfilPanel operador={operador} onLogout={onLogout} portalLabel="Operador comité" />
    }

    return (
      <main className="content">
        <header className="page-header">
          <div>
            <h2>Solicitudes</h2>
            <p>Tablero de estado de expedientes en comité</p>
          </div>
          <div className="page-actions">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="select-filter"
            >
              <option value="todos">Todos los estados</option>
              <option value="promovido_nucleo">Promovido al núcleo</option>
              <option value="recibido_comite">Recibido comité</option>
              <option value="en_evaluacion">En evaluación</option>
              <option value="aprobado">Aprobado</option>
              <option value="condicionado">Condicionado</option>
              <option value="rechazado">Rechazado</option>
              <option value="desembolsado">Desembolsado</option>
            </select>
            <button type="button" className="btn btn-outline" onClick={() => setBusqueda('')} style={{ width: 'auto' }}>
              Actualizar vista
            </button>
          </div>
        </header>

        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">En comité</span>
            <strong>{stats.comite}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Aprobados</span>
            <strong>{stats.aprobados}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total expedientes</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <SolicitudesTable solicitudes={filtradas} />
      </main>
    )
  }

  return (
    <div className="app-shell app-shell--comite">
      <ComiteSidebar
        active={activeTab}
        stats={stats}
        onNavigate={navigate}
        role={operador.rol}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="main-area">
        <ComiteTopBar
          operador={operador}
          hora={now}
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          onLogout={onLogout}
          onProfile={() => navigate('perfil')}
          onMenuToggle={() => setMenuOpen((v) => !v)}
        />
        {renderContent()}
      </div>
    </div>
  )
}
