import { useEffect, useState } from 'react'
import { initTelegram } from './telegram.js'
import Feed from './Feed.jsx'
import PostComposer from './PostComposer.jsx'
import './composer.css'

export default function App() {
  const [tgId, setTgId] = useState(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [feedKey, setFeedKey] = useState(0)

  useEffect(() => {
    const user = initTelegram()
    setTgId(user?.id ?? null)
  }, [])

  function onPosted() {
    setComposerOpen(false)
    setFeedKey((k) => k + 1)
  }

  return (
    <>
      <Feed key={feedKey} tgId={tgId} />
      <button className="fab" onClick={() => setComposerOpen(true)} aria-label="Выложить образ">
        +
      </button>
      {composerOpen && (
        <PostComposer onClose={() => setComposerOpen(false)} onPosted={onPosted} />
      )}
    </>
  )
}
