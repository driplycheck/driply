import { useEffect, useState } from 'react'
import { initTelegram } from './telegram.js'
import Feed from './Feed.jsx'

export default function App() {
  const [, setUser] = useState(null)

  useEffect(() => {
    setUser(initTelegram())
  }, [])

  return <Feed />
}
