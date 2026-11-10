import { useEffect, useState } from 'react'
import Landing from './landing/Landing'
import Chat from './chat/Chat'

const route = () => (location.hash.startsWith('#/chat') ? 'chat' : 'home')

export default function App() {
  const [r, setR] = useState(route)
  useEffect(() => {
    const on = () => {
      setR(route())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r === 'chat' ? <Chat /> : <Landing />
}
