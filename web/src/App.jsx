import { useEffect, useState } from 'react'
import { initTelegram } from './telegram.js'
import Feed from './Feed.jsx'

export default function App() {
  const [tgId, setTgId] = useState(null)

  useEffect(() => {
    const user = initTelegram()
    setTgId(user?.id ?? null)
  }, [])

  return <Feed tgId={tgId} />
}
