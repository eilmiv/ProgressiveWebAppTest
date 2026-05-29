import type { Counter } from './types'

export type CounterState = {
  byId: Record<string, Counter>
  order: string[]
}

export const emptyCounterState = (): CounterState => ({ byId: {}, order: [] })

export const createCounter = (name: string): Counter => ({
  id: crypto.randomUUID(),
  name,
  value: 0,
})

export const hydrateCounterState = (counters: Counter[]): CounterState => {
  const byId: Record<string, Counter> = {}
  const order: string[] = []

  for (const counter of counters) {
    byId[counter.id] = counter
    order.push(counter.id)
  }

  return { byId, order }
}

export const counterStateToList = (state: CounterState): Counter[] =>
  state.order
    .map((id) => state.byId[id])
    .filter((counter): counter is Counter => Boolean(counter))

export const upsertCounter = (state: CounterState, counter: Counter): CounterState => {
  if (state.byId[counter.id]) {
    return {
      byId: { ...state.byId, [counter.id]: counter },
      order: state.order,
    }
  }

  return {
    byId: { ...state.byId, [counter.id]: counter },
    order: [...state.order, counter.id],
  }
}

export const incrementCounter = (state: CounterState, counterId: string): CounterState => {
  const counter = state.byId[counterId]
  if (!counter) {
    return state
  }

  return {
    byId: {
      ...state.byId,
      [counterId]: { ...counter, value: counter.value + 1 },
    },
    order: state.order,
  }
}

export const decrementCounter = (state: CounterState, counterId: string): CounterState => {
  const counter = state.byId[counterId]
  if (!counter) {
    return state
  }

  return {
    byId: {
      ...state.byId,
      [counterId]: { ...counter, value: counter.value - 1 },
    },
    order: state.order,
  }
}

export const removeCounter = (state: CounterState, counterId: string): CounterState => {
  if (!state.byId[counterId]) {
    return state
  }

  const { [counterId]: removedCounter, ...nextById } = state.byId
  void removedCounter
  return {
    byId: nextById,
    order: state.order.filter((id) => id !== counterId),
  }
}
