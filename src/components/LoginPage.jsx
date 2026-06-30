import { useState } from 'react'
import { User, Lock, Shield, KeyRound, Sparkles } from 'lucide-react'
import { loginWithRbac } from '../services/authService'
import { isVentasCodigo } from '../firebase'

export default function LoginPage({ onLogin }) {
  const [codigo, setCodigo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!isVentasCodigo(codigo)) {
      setError('Ingresa un código válido (ej. EMP-45821, SUP-45821)')
      return
    }
    if (clave.length < 6) {
      setError('La clave debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await onLogin(codigo, clave, loginWithRbac)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">FV</div>
          <div>
            <h1>CMAC Ica</h1>
            <p>Fuerza de Ventas — Portal Web</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Código asesor
            <div className="login-field">
              <User className="login-field-icon" size={18} />
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="EMP-45821"
                autoComplete="username"
              />
            </div>
          </label>
          <label>
            Clave
            <div className="login-field">
              <Lock className="login-field-icon" size={18} />
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="••••••"
                autoComplete="current-password"
              />
            </div>
          </label>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <div className="login-features">
          <span className="login-feature">
            <Shield size={14} />
            JWT + RBAC
          </span>
          <span className="login-feature">
            <KeyRound size={14} />
            Bloqueo 5 intentos
          </span>
          <span className="login-feature">
            <Sparkles size={14} />
            Demo EMP-45821
          </span>
        </div>
        <p className="login-hint">
          Clave demo: <strong>123456</strong> · Supervisor: <strong>SUP-45821</strong>
        </p>
      </div>
    </div>
  )
}
