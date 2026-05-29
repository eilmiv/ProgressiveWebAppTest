import type { Counter } from './types'

export const createLocalCounter = (name: string): Counter => ({
  localId: `local-${crypto.randomUUID()}`,
  name,
  value: 0,
})

export const incrementLocalCounter = (counters: Counter[], localId: string): Counter[] =>
  counters.map((counter) =>
    counter.localId === localId ? { ...counter, value: counter.value + 1 } : counter,
  )

export const decrementLocalCounter = (counters: Counter[], localId: string): Counter[] =>
  counters.map((counter) =>
    counter.localId === localId ? { ...counter, value: counter.value - 1 } : counter,
  )

export const removeLocalCounter = (counters: Counter[], localId: string): Counter[] =>
  counters.filter((counter) => counter.localId !== localId)
