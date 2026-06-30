import { useEffect, useState } from 'react'
import {
  observeSolicitud,
  registrarVisita,
  guardarFicha,
  registrarPreEvaluacion,
  guardarBuro,
  guardarSimulacionYFirma,
  promoverAComite,
  registrarOriginacionCampo,
  pasoDesdeEstado
} from '../services/ventasService'
import {
  simularCronograma as simCron,
  consultarBuro as consultBuro,
  construirFicha as buildFicha,
  evaluarPreEvaluacion as evalPre,
  historialDemo as histDemo
} from '../domain/originacionEngines'
import { PASOS_ORIGINACION, formatSoles, semaforoColor } from '../utils'

export default function OriginacionStepper({ solicitudId, asesor, onBack, onDone }) {
  const modoCampo = !solicitudId
  const [paso, setPaso] = useState(0)
  const [loading, setLoading] = useState(!modoCampo)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [documento, setDocumento] = useState('')
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [plazoMeses, setPlazoMeses] = useState('12')
  const [destino, setDestino] = useState('Capital de trabajo')
  const [garantia, setGarantia] = useState('Sin garantía real')
  const [ingreso, setIngreso] = useState('')
  const [observacion, setObservacion] = useState('')
  const [lat, setLat] = useState(-14.068)
  const [lng, setLng] = useState(-75.7255)
  const [gpsOk, setGpsOk] = useState(false)
  const [consentimiento, setConsentimiento] = useState(false)
  const [firma, setFirma] = useState(false)

  const [ficha, setFicha] = useState(null)
  const [buro, setBuro] = useState(null)
  const [preEval, setPreEval] = useState(null)
  const [simulacion, setSimulacion] = useState(null)
  const [expedienteCreado, setExpedienteCreado] = useState('')

  useEffect(() => {
    if (modoCampo) return
    return observeSolicitud(solicitudId, (s) => {
      if (!s) {
        setError('Solicitud no encontrada')
        setLoading(false)
        return
      }
      setDocumento(s.documentoCliente)
      setNombre(s.nombreCliente)
      if (s.monto > 0) setMonto(String(Math.round(s.monto)))
      if (s.plazoMeses > 0) setPlazoMeses(String(s.plazoMeses))
      if (s.destino) setDestino(s.destino)
      if (s.garantia) setGarantia(s.garantia)
      if (s.visita?.observacion) setObservacion(s.visita.observacion)
      if (s.visita?.visitado) {
        setLat(s.visita.latitud)
        setLng(s.visita.longitud)
        setGpsOk(true)
      }
      if (s.ficha?.documento) setFicha(s.ficha)
      if (s.consultaBuro?.fechaConsulta) setBuro(s.consultaBuro)
      if (s.preEvaluacion?.fecha) setPreEval(s.preEvaluacion)
      if (s.simulacion?.monto > 0) setSimulacion(s.simulacion)
      setFirma(s.firmaCapturada)
      setPaso(pasoDesdeEstado(s))
      setLoading(false)
    })
  }, [solicitudId, modoCampo])

  useEffect(() => {
    if (paso === 4 && !simulacion) {
      const m = parseFloat(monto) || 0
      const p = parseInt(plazoMeses, 10) || 12
      setSimulacion(simCron(m, p))
    }
  }, [paso, monto, plazoMeses, simulacion])

  function buildFichaLocal() {
    const m = parseFloat(monto) || 0
    const p = parseInt(plazoMeses, 10) || 12
    const ing = parseFloat(ingreso) || 0
    const f = buildFicha({
      documento,
      nombre,
      monto: m,
      plazoMeses: p,
      ingresoMensual: ing,
      lat: gpsOk ? lat : -14.068,
      lng: gpsOk ? lng : -75.7255,
      historial: histDemo(documento)
    })
    setFicha(f)
    return f
  }

  function capturarGps() {
    if (!navigator.geolocation) {
      setGpsOk(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setGpsOk(true)
      },
      () => {
        setGpsOk(true)
      }
    )
  }

  async function guardarPasoFicha() {
    const f = buildFichaLocal()
    if (modoCampo) {
      setPaso(1)
      setMessage('Ficha construida')
      return
    }
    setActionLoading(true)
    try {
      await guardarFicha(solicitudId, asesor.codigo, f)
      setPaso(1)
      setMessage('Ficha guardada')
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function guardarPasoVisita() {
    if (modoCampo) {
      setPaso(2)
      return
    }
    setActionLoading(true)
    try {
      await registrarVisita(solicitudId, asesor.codigo, observacion, lat, lng)
      setPaso(2)
      setMessage('Visita registrada')
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  function ejecutarPreEval() {
    const f = ficha || buildFichaLocal()
    const b = buro || { listaNegra: false, sbsPuntaje: 0, fechaConsulta: '' }
    setPreEval(evalPre(f, b))
    setMessage('Pre-evaluación ejecutada')
    setError('')
  }

  async function guardarPasoPreEval() {
    const pre = preEval || (() => {
      const f = ficha || buildFichaLocal()
      const b = buro || { listaNegra: false, sbsPuntaje: 0, fechaConsulta: '' }
      return evalPre(f, b)
    })()
    setPreEval(pre)
    if (modoCampo) {
      setPaso(3)
      return
    }
    setActionLoading(true)
    try {
      await registrarPreEvaluacion(solicitudId, asesor.codigo, pre)
      setPaso(3)
      setMessage('Pre-evaluación guardada')
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function guardarPasoBuro() {
    if (!consentimiento) {
      setError('Debe firmar el consentimiento para consultar buró')
      return
    }
    const b = consultBuro(documento, true)
    setBuro(b)
    const f = ficha || buildFichaLocal()
    setPreEval(evalPre(f, b))
    if (modoCampo) {
      setPaso(4)
      return
    }
    setActionLoading(true)
    try {
      await guardarBuro(solicitudId, asesor.codigo, b)
      setPaso(4)
      setMessage('Buró registrado')
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function guardarPasoCronograma() {
    if (!firma) {
      setError('Debe confirmar la firma del cliente')
      return
    }
    const m = parseFloat(monto) || 0
    const p = parseInt(plazoMeses, 10) || 12
    const sim = simCron(m, p)
    setSimulacion(sim)
    if (modoCampo) {
      setPaso(5)
      return
    }
    setActionLoading(true)
    try {
      await guardarSimulacionYFirma(solicitudId, asesor.codigo, sim, true)
      setPaso(5)
      setMessage('Cronograma y firma guardados')
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function transmitir() {
    setActionLoading(true)
    setError('')
    try {
      const m = parseFloat(monto) || 0
      const p = parseInt(plazoMeses, 10) || 12
      const f = ficha || buildFichaLocal()
      const b = buro || consultBuro(documento, true)
      const pre = preEval || evalPre(f, b)
      const sim = simulacion || simCron(m, p)
      const visita = {
        visitado: true,
        observacion,
        latitud: lat,
        longitud: lng,
        fecha: new Date().toLocaleString('es-PE')
      }

      if (modoCampo) {
        const { id, expediente } = await registrarOriginacionCampo({
          asesorCodigo: asesor.codigo,
          agenciaId: asesor.agenciaId,
          documento,
          nombre,
          monto: m,
          plazoMeses: p,
          destino,
          garantia,
          ficha: f,
          buro: b,
          preEvaluacion: pre,
          simulacion: sim,
          visita
        })
        await promoverAComite(id, asesor.codigo)
        setExpedienteCreado(expediente)
        setMessage(`Expediente ${expediente} registrado y promovido al comité`)
      } else {
        await promoverAComite(solicitudId, asesor.codigo)
        setMessage('Expediente promovido al comité')
      }
      onDone?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <main className="content originacion-page">
      <header className="page-header">
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
            ← Volver
          </button>
          <h2>{modoCampo ? 'Originación en campo' : 'Originación expediente'}</h2>
          {expedienteCreado ? <p className="success-msg">{expedienteCreado}</p> : null}
        </div>
      </header>

      <div className="stepper">
        {PASOS_ORIGINACION.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`stepper-item ${paso === s.id ? 'active' : paso > s.id ? 'done' : ''}`}
            onClick={() => setPaso(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {message && <p className="success-msg">{message}</p>}
      {error && <p className="error-msg">{error}</p>}

      <div className="originacion-form">
        {paso === 0 && (
          <>
            <h3>1. Ficha del cliente</h3>
            <div className="form-grid">
              <label>
                DNI
                <input value={documento} onChange={(e) => setDocumento(e.target.value)} />
              </label>
              <label>
                Nombre
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </label>
              <label>
                Monto (S/)
                <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))} />
              </label>
              <label>
                Plazo (meses)
                <input value={plazoMeses} onChange={(e) => setPlazoMeses(e.target.value.replace(/\D/g, ''))} />
              </label>
              <label>
                Ingreso mensual
                <input value={ingreso} onChange={(e) => setIngreso(e.target.value.replace(/[^\d.]/g, ''))} />
              </label>
              <label>
                Destino
                <input value={destino} onChange={(e) => setDestino(e.target.value)} />
              </label>
              <label>
                Garantía
                <input value={garantia} onChange={(e) => setGarantia(e.target.value)} />
              </label>
            </div>
            {ficha && (
              <div className="stat-card originacion-stat">
                <p>
                  Semáforo:{' '}
                  <span style={{ color: semaforoColor(ficha.semaforo) }}>{ficha.semaforo}</span>
                </p>
                <p>{ficha.motivoElegibilidad}</p>
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-primary" disabled={actionLoading} onClick={guardarPasoFicha}>
                Guardar ficha
              </button>
            </div>
          </>
        )}

        {paso === 1 && (
          <>
            <h3>2. Visita de campo</h3>
            <label>
              Observación
              <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={3} />
            </label>
            <p className="muted gps-status">
              GPS: {gpsOk ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'No capturado'}
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={capturarGps}>
                Capturar ubicación
              </button>
              <button type="button" className="btn btn-primary" disabled={actionLoading} onClick={guardarPasoVisita}>
                Registrar visita
              </button>
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <h3>3. Pre-evaluación</h3>
            {preEval ? (
              <div className="stat-card originacion-stat">
                <p>Resultado: <strong className="result-badge">{preEval.resultadoObtenido}</strong></p>
                <p>Capacidad pago: {preEval.capacidadPagoOk ? 'OK' : 'NO'}</p>
                <p>Buró: {preEval.buroOk ? 'OK' : 'Pendiente'}</p>
              </div>
            ) : (
              <p className="muted">Ejecuta la pre-evaluación para ver el resultado.</p>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={ejecutarPreEval}>
                Ejecutar pre-evaluación
              </button>
              <button type="button" className="btn btn-primary" disabled={actionLoading || !preEval} onClick={guardarPasoPreEval}>
                Guardar y continuar
              </button>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <h3>4. Consulta buró</h3>
            <label className="checkbox-row">
              <input type="checkbox" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} />
              Consentimiento firmado para consulta SBS
            </label>
            {buro && (
              <div className="stat-card originacion-stat">
                <p>Calificación SBS: <strong className="result-badge">{buro.sbsCalificacion}</strong> ({buro.sbsPuntaje} pts)</p>
                <p>{buro.observacion}</p>
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-primary" disabled={actionLoading} onClick={guardarPasoBuro}>
                Consultar y guardar buró
              </button>
            </div>
          </>
        )}

        {paso === 4 && (
          <>
            <h3>5. RF-47 — Cronograma francés</h3>
            {simulacion && (
              <div className="cronograma-panel">
                <div className="cronograma-summary">
                  <div className="cronograma-metric">
                    <span>TEA</span>
                    <strong>{simulacion.tea?.toFixed(2)}%</strong>
                  </div>
                  <div className="cronograma-metric">
                    <span>Cuota mensual</span>
                    <strong>{formatSoles(simulacion.cuotaMensual)}</strong>
                  </div>
                  <div className="cronograma-metric">
                    <span>Total a pagar</span>
                    <strong>{formatSoles(simulacion.totalPagar)}</strong>
                  </div>
                </div>
                <div className="cronograma-table">
                  <div className="cronograma-table-head">
                    <span>#</span>
                    <span>Vencimiento</span>
                    <span>Cuota</span>
                  </div>
                  {(simulacion.cronograma || []).slice(0, 3).map((c) => (
                    <div key={c.numero} className="cronograma-table-row">
                      <span>{c.numero}</span>
                      <span>{c.fechaVencimiento}</span>
                      <span>{formatSoles(c.cuota)}</span>
                    </div>
                  ))}
                </div>
                {(simulacion.cronograma?.length || 0) > 3 && (
                  <p className="muted cronograma-more">… y {simulacion.cronograma.length - 3} cuotas más</p>
                )}
              </div>
            )}
            <label className="checkbox-row">
              <input type="checkbox" checked={firma} onChange={(e) => setFirma(e.target.checked)} />
              Firma del cliente capturada
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-primary" disabled={actionLoading} onClick={guardarPasoCronograma}>
                Guardar cronograma y firma
              </button>
            </div>
          </>
        )}

        {paso === 5 && (
          <>
            <h3>6. Transmitir al comité</h3>
            <div className="stat-card originacion-stat">
              <p><strong className="result-badge">{nombre}</strong> · DNI {documento}</p>
              <p>Monto: {formatSoles(monto)} · Plazo: {plazoMeses} meses</p>
              {ficha && <p>Semáforo: {ficha.semaforo}</p>}
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-primary" disabled={actionLoading} onClick={transmitir}>
                {actionLoading ? 'Transmitiendo…' : modoCampo ? 'Registrar y promover a comité' : 'Promover a comité'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
