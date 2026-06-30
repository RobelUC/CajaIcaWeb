import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, emailToCodigo, firebaseConfigError } from './firebase'
import { getRole } from './security/tokenStore'
import { roleFromEmail, canAccessPortal, ROLES } from './security/rbac'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import ComiteDashboard from './components/comite/ComiteDashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (firebaseConfigError || !auth) {
      setLoading(false)
      return undefined
    }

    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) {
        const r = getRole() || roleFromEmail(u.email)
        setRole(canAccessPortal(r) ? r : null)
      } else {
        setRole(null)
      }
      setLoading(false)
    })
  }, [])

  if (firebaseConfigError) {
    return (
      <div className="loading-screen">
        <h1 style={{ marginBottom: '0.75rem' }}>Configuración incompleta</h1>
        <p style={{ maxWidth: 520, textAlign: 'center', lineHeight: 1.5 }}>{firebaseConfigError}</p>
        <p style={{ maxWidth: 520, textAlign: 'center', marginTop: '1rem', opacity: 0.85 }}>
          Agrega las variables <code>VITE_FIREBASE_*</code> en Vercel y vuelve a desplegar.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Cargando portal…</p>
      </div>
    )
  }

  if (!user || !role) {
    return (
      <LoginPage
        onLogin={async (codigo, clave, loginFn) => {
          const r = await loginFn(codigo, clave)
          setRole(r.role)
        }}
      />
    )
  }

  return role === ROLES.COMITE ? (
    <ComiteDashboard
      operador={{
        codigo: emailToCodigo(user.email),
        email: user.email,
        rol: role
      }}
      onLogout={() => signOut(auth)}
    />
  ) : (
    <Dashboard
      operador={{
        codigo: emailToCodigo(user.email),
        email: user.email,
        rol: role
      }}
      onLogout={() => signOut(auth)}
    />
  )
}
