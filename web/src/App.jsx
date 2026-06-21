import { useEffect, useState } from 'react'
import { initTelegram } from './telegram.js'

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    setUser(initTelegram())
  }, [])

  return (
    <div className="screen">
      <h1>Driply</h1>
      {user ? (
        <p>Привет, {user.first_name} 👋</p>
      ) : (
        <p>Открой через Telegram, чтобы войти.</p>
      )}
      <p className="muted">Skeleton online — pipeline works.</p>
    </div>
  )
}
