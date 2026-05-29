import { describe, expect, it } from 'vitest'

import {
  createLocalCounter,
  decrementLocalCounter,
  incrementLocalCounter,
  removeLocalCounter,
} from './counterState'

describe('counter state helpers', () => {
  it('creates and updates counters', () => {
    const counter = createLocalCounter('Test')
    let counters = [counter]

    counters = incrementLocalCounter(counters, counter.localId)
    counters = decrementLocalCounter(counters, counter.localId)

    expect(counters[0].value).toBe(0)
  })

  it('removes counters by local id', () => {
    const a = createLocalCounter('A')
    const b = createLocalCounter('B')
    const counters = removeLocalCounter([a, b], a.localId)

    expect(counters).toHaveLength(1)
    expect(counters[0].name).toBe('B')
  })
})
