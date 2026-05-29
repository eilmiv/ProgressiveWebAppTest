import { describe, expect, it } from 'vitest'

import {
  counterStateToList,
  createCounter,
  decrementCounter,
  emptyCounterState,
  incrementCounter,
  removeCounter,
  upsertCounter,
} from './counterState'

describe('counter state helpers', () => {
  it('creates and updates counters by id', () => {
    const counter = createCounter('Test')
    let state = upsertCounter(emptyCounterState(), counter)

    state = incrementCounter(state, counter.id)
    state = decrementCounter(state, counter.id)

    expect(state.byId[counter.id].value).toBe(0)
  })

  it('removes counters by id', () => {
    const a = createCounter('A')
    const b = createCounter('B')
    let state = upsertCounter(emptyCounterState(), a)
    state = upsertCounter(state, b)

    state = removeCounter(state, a.id)
    const counters = counterStateToList(state)

    expect(counters).toHaveLength(1)
    expect(counters[0].name).toBe('B')
  })
})
