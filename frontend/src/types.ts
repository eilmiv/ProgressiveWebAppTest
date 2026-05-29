export type Counter = {
  localId: string
  serverId?: number
  name: string
  value: number
}

export type AppSnapshot = {
  version: number
  username: string | null
  counters: Counter[]
}
