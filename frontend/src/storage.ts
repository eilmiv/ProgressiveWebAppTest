import type { AppSnapshot } from './types'

const DB_NAME = 'pwa-counter-store'
const DB_VERSION = 1
const STORE = 'app-data'
const SNAPSHOT_KEY = 'snapshot'

const defaultSnapshot: AppSnapshot = { version: 1, username: null, counters: [] }

const openDB = async (): Promise<IDBDatabase> =>
  await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const withStore = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => Promise<T>): Promise<T> => {
  const db = await openDB()
  try {
    const transaction = db.transaction(STORE, mode)
    const store = transaction.objectStore(STORE)
    return await action(store)
  } finally {
    db.close()
  }
}

export const loadSnapshot = async (): Promise<AppSnapshot> =>
  withStore('readonly', async (store) =>
    await new Promise((resolve) => {
      const request = store.get(SNAPSHOT_KEY)
      request.onsuccess = () => {
        const snapshot = request.result as AppSnapshot | undefined
        resolve(snapshot ?? defaultSnapshot)
      }
      request.onerror = () => resolve(defaultSnapshot)
    }),
  )

export const saveSnapshot = async (snapshot: AppSnapshot): Promise<void> => {
  await withStore('readwrite', async (store) =>
    await new Promise((resolve, reject) => {
      const request = store.put(snapshot, SNAPSHOT_KEY)
      request.onsuccess = () => resolve(undefined)
      request.onerror = () => reject(request.error)
    }),
  )
}

export const clearSnapshot = async (): Promise<void> => {
  await saveSnapshot(defaultSnapshot)
}
