import { useEffect, useMemo, useState } from 'react'

import {
  addCounter as addCounterApi,
  decrementCounter as decrementCounterApi,
  deleteCounter,
  fetchCounters,
  incrementCounter as incrementCounterApi,
  login as loginApi,
  logout as logoutApi,
  sessionStatus,
} from './api'
import type { ServerCounter } from './api'
import {
  createLocalCounter,
  decrementLocalCounter,
  incrementLocalCounter,
  removeLocalCounter,
} from './counterState'
import { clearSnapshot, loadSnapshot, saveSnapshot } from './storage'
import type { Counter } from './types'
import './App.css'

const fromServerCounter = (counter: ServerCounter): Counter => ({
  localId: `server-${counter.id}`,
  serverId: counter.id,
  name: counter.name,
  value: counter.value,
})

function App() {
  const [username, setUsername] = useState<string | null>(null)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [counterName, setCounterName] = useState('')
  const [counters, setCounters] = useState<Counter[]>([])
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const init = async () => {
      const snapshot = await loadSnapshot()
      setUsername(snapshot.username)
      setCounters(snapshot.counters)

      try {
        const session = await sessionStatus()
        if (session.isAuthenticated && session.username) {
          const response = await fetchCounters()
          const serverCounters = response.counters.map((counter) => fromServerCounter(counter))
          setUsername(session.username)
          setCounters(serverCounters)
          await saveSnapshot({ version: 1, username: session.username, counters: serverCounters })
        }
      } catch {
        setStatusMessage('Offline mode: using local data')
      }
    }

    void init()
  }, [])

  const persist = async (nextUsername: string | null, nextCounters: Counter[]) => {
    setCounters(nextCounters)
    setUsername(nextUsername)
    await saveSnapshot({ version: 1, username: nextUsername, counters: nextCounters })
  }

  const login = async () => {
    try {
      await sessionStatus()
      const response = await loginApi(loginUsername, loginPassword)
      const serverCounters = response.counters.map((counter) => fromServerCounter(counter))
      await persist(response.username, serverCounters)
      setStatusMessage('Logged in')
      setLoginPassword('')
    } catch {
      setStatusMessage('Login failed')
    }
  }

  const logout = async () => {
    try {
      await logoutApi()
    } finally {
      await clearSnapshot()
      setUsername(null)
      setCounters([])
      setStatusMessage('Logged out and local user data removed')
    }
  }

  const addCounter = async () => {
    const name = counterName.trim() || 'Counter'
    if (username) {
      try {
        const created = await addCounterApi(name)
        const nextCounters = [...counters, fromServerCounter(created)]
        await persist(username, nextCounters)
      } catch {
        const nextCounters = [...counters, createLocalCounter(name)]
        await persist(username, nextCounters)
        setStatusMessage('Added locally while offline')
      }
    } else {
      const nextCounters = [...counters, createLocalCounter(name)]
      await persist(null, nextCounters)
    }
    setCounterName('')
  }

  const updateCounter = async (
    localId: string,
    operation: 'increment' | 'decrement' | 'remove',
  ) => {
    const target = counters.find((counter) => counter.localId === localId)
    if (!target) {
      return
    }

    let nextCounters: Counter[]
    if (operation === 'increment') {
      nextCounters = incrementLocalCounter(counters, localId)
      if (target.serverId) {
        try {
          const updated = await incrementCounterApi(target.serverId)
          nextCounters = counters.map((counter) =>
            counter.localId === localId ? { ...counter, value: updated.value } : counter,
          )
        } catch {
          setStatusMessage('Increment saved locally (offline)')
        }
      }
    } else if (operation === 'decrement') {
      nextCounters = decrementLocalCounter(counters, localId)
      if (target.serverId) {
        try {
          const updated = await decrementCounterApi(target.serverId)
          nextCounters = counters.map((counter) =>
            counter.localId === localId ? { ...counter, value: updated.value } : counter,
          )
        } catch {
          setStatusMessage('Decrement saved locally (offline)')
        }
      }
    } else {
      nextCounters = removeLocalCounter(counters, localId)
      if (target.serverId) {
        try {
          await deleteCounter(target.serverId)
        } catch {
          setStatusMessage('Remove saved locally (offline)')
        }
      }
    }

    await persist(username, nextCounters)
  }

  const canLogin = useMemo(
    () => loginUsername.trim().length > 0 && loginPassword.trim().length > 0,
    [loginPassword, loginUsername],
  )

  return (
    <main className="app">
      <h1>Progressive Counter App</h1>
      <p className="status">{statusMessage}</p>

      {username ? (
        <section>
          <p>Logged in as <strong>{username}</strong></p>
          <button type="button" onClick={logout}>Logout</button>
        </section>
      ) : (
        <section className="auth-form">
          <input
            placeholder="Username"
            value={loginUsername}
            onChange={(event) => setLoginUsername(event.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
          />
          <button type="button" onClick={login} disabled={!canLogin}>Login</button>
        </section>
      )}

      <section className="counter-add">
        <input
          placeholder="Counter name"
          value={counterName}
          onChange={(event) => setCounterName(event.target.value)}
        />
        <button type="button" onClick={addCounter}>Add counter</button>
      </section>

      <ul className="counter-list">
        {counters.map((counter) => (
          <li key={counter.localId}>
            <span>{counter.name}: {counter.value}</span>
            <button type="button" onClick={() => void updateCounter(counter.localId, 'increment')}>+</button>
            <button type="button" onClick={() => void updateCounter(counter.localId, 'decrement')}>-</button>
            <button type="button" onClick={() => void updateCounter(counter.localId, 'remove')}>Remove</button>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
