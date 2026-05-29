import { useEffect, useMemo, useState } from 'react'

import {
  login as loginApi,
  logout as logoutApi,
  sessionStatus,
  syncCounters,
} from './api'
import {
  counterStateToList,
  createCounter,
  decrementCounter,
  emptyCounterState,
  hydrateCounterState,
  incrementCounter,
  removeCounter,
  type CounterState,
  upsertCounter,
} from './counterState'
import {
  clearAllLocalData,
  loadAppState,
  putCounter,
  removeCounterRecord,
  replaceCounters,
  saveDeletedIds,
  saveUsername,
} from './storage'
import './App.css'

const syncAll = async (
  username: string,
  state: CounterState,
  deletedIds: string[],
): Promise<{ nextState: CounterState; nextDeletedIds: string[] }> => {
  const response = await syncCounters(counterStateToList(state), deletedIds)
  const nextState = hydrateCounterState(response.counters)
  await replaceCounters(response.counters)
  await saveDeletedIds([])
  await saveUsername(username)
  return { nextState, nextDeletedIds: [] }
}

function App() {
  const [username, setUsername] = useState<string | null>(null)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [counterName, setCounterName] = useState('')
  const [counterState, setCounterState] = useState<CounterState>(emptyCounterState())
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const init = async () => {
      const local = await loadAppState()
      const localState = hydrateCounterState(local.counters)
      setUsername(local.username)
      setCounterState(localState)
      setDeletedIds(local.deletedIds)

      try {
        const session = await sessionStatus()
        if (session.isAuthenticated && session.username) {
          const synced = await syncAll(session.username, localState, local.deletedIds)
          setUsername(session.username)
          setCounterState(synced.nextState)
          setDeletedIds(synced.nextDeletedIds)
        } else {
          setUsername(null)
          await saveUsername(null)
        }
      } catch {
        setStatusMessage('Offline mode: using local data')
      }
    }

    void init()
  }, [])

  const login = async () => {
    try {
      await sessionStatus()
      const response = await loginApi(loginUsername, loginPassword)
      const synced = await syncAll(response.username, counterState, deletedIds)
      setUsername(response.username)
      setCounterState(synced.nextState)
      setDeletedIds(synced.nextDeletedIds)
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
      await clearAllLocalData()
      setUsername(null)
      setCounterState(emptyCounterState())
      setDeletedIds([])
      setStatusMessage('Logged out and local user data removed')
    }
  }

  const syncIfAuthenticated = async (nextState: CounterState, nextDeletedIds: string[]) => {
    if (!username) {
      return
    }

    try {
      const synced = await syncAll(username, nextState, nextDeletedIds)
      setCounterState(synced.nextState)
      setDeletedIds(synced.nextDeletedIds)
    } catch {
      setStatusMessage('Saved locally (offline), will sync later')
    }
  }

  const addCounter = async () => {
    const name = counterName.trim() || 'Counter'
    const nextCounter = createCounter(name)
    const nextState = upsertCounter(counterState, nextCounter)

    setCounterState(nextState)
    await putCounter(nextCounter)
    await syncIfAuthenticated(nextState, deletedIds)
    setCounterName('')
  }

  const updateCounter = async (
    counterId: string,
    operation: 'increment' | 'decrement' | 'remove',
  ) => {
    let nextState: CounterState
    let nextDeletedIds = deletedIds

    if (operation === 'increment') {
      nextState = incrementCounter(counterState, counterId)
      const updated = nextState.byId[counterId]
      if (updated) {
        await putCounter(updated)
      }
    } else if (operation === 'decrement') {
      nextState = decrementCounter(counterState, counterId)
      const updated = nextState.byId[counterId]
      if (updated) {
        await putCounter(updated)
      }
    } else {
      nextState = removeCounter(counterState, counterId)
      nextDeletedIds = [...deletedIds, counterId]
      await removeCounterRecord(counterId)
      await saveDeletedIds(nextDeletedIds)
    }

    setCounterState(nextState)
    setDeletedIds(nextDeletedIds)
    await syncIfAuthenticated(nextState, nextDeletedIds)
  }

  const canLogin = useMemo(
    () => loginUsername.trim().length > 0 && loginPassword.trim().length > 0,
    [loginPassword, loginUsername],
  )

  const counters = counterStateToList(counterState)

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
          <li key={counter.id}>
            <span>{counter.name}: {counter.value}</span>
            <button type="button" onClick={() => void updateCounter(counter.id, 'increment')}>+</button>
            <button type="button" onClick={() => void updateCounter(counter.id, 'decrement')}>-</button>
            <button type="button" onClick={() => void updateCounter(counter.id, 'remove')}>Remove</button>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
