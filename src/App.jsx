import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, emailToCodigo } from './firebase'
import { getRole } from './security/tokenStore'
import { roleFromEmail, canAccessVentas } from './security/rbac'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) {
        const r = getRole() || roleFromEmail(u.email)
        setRole(canAccessVentas(r) ? r : null)
      } else {
        setRole(null)
      }
      setLoading(false)
    })
  }, [])

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

  return (
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
