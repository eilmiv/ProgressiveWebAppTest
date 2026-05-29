import type { Counter } from './types'

const DB_NAME = 'pwa-counter-store'
const DB_VERSION = 2
const COUNTER_STORE = 'counters'
const META_STORE = 'meta'

const USERNAME_KEY = 'username'
const DELETED_IDS_KEY = 'deletedIds'

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })

const openDB = (): Promise<IDBDatabase> => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(COUNTER_STORE)) {
      db.createObjectStore(COUNTER_STORE, { keyPath: 'id' })
    }
    if (!db.objectStoreNames.contains(META_STORE)) {
      db.createObjectStore(META_STORE)
    }
  }
  return requestToPromise(request)
}

const withTransaction = async <T>(
  mode: IDBTransactionMode,
  action: (stores: { counters: IDBObjectStore; meta: IDBObjectStore }, transaction: IDBTransaction) => Promise<T>,
): Promise<T> => {
  const db = await openDB()
  try {
    const transaction = db.transaction([COUNTER_STORE, META_STORE], mode)
    const stores = {
      counters: transaction.objectStore(COUNTER_STORE),
      meta: transaction.objectStore(META_STORE),
    }
    const result = await action(stores, transaction)
    await transactionDone(transaction)
    return result
  } finally {
    db.close()
  }
}

export const loadAppState = async (): Promise<{ username: string | null; counters: Counter[]; deletedIds: string[] }> =>
  withTransaction('readonly', async ({ counters, meta }) => {
    const [allCounters, username, deletedIds] = await Promise.all([
      requestToPromise(counters.getAll() as IDBRequest<Counter[]>),
      requestToPromise(meta.get(USERNAME_KEY) as IDBRequest<string | undefined>),
      requestToPromise(meta.get(DELETED_IDS_KEY) as IDBRequest<string[] | undefined>),
    ])

    return {
      username: username ?? null,
      counters: allCounters,
      deletedIds: deletedIds ?? [],
    }
  })

export const saveUsername = async (username: string | null): Promise<void> => {
  await withTransaction('readwrite', async ({ meta }) => {
    if (username === null) {
      await requestToPromise(meta.delete(USERNAME_KEY))
    } else {
      await requestToPromise(meta.put(username, USERNAME_KEY))
    }
  })
}

export const saveDeletedIds = async (deletedIds: string[]): Promise<void> => {
  await withTransaction('readwrite', async ({ meta }) => {
    await requestToPromise(meta.put(deletedIds, DELETED_IDS_KEY))
  })
}

export const putCounter = async (counter: Counter): Promise<void> => {
  await withTransaction('readwrite', async ({ counters }) => {
    await requestToPromise(counters.put(counter))
  })
}

export const removeCounterRecord = async (counterId: string): Promise<void> => {
  await withTransaction('readwrite', async ({ counters }) => {
    await requestToPromise(counters.delete(counterId))
  })
}

export const replaceCounters = async (nextCounters: Counter[]): Promise<void> => {
  await withTransaction('readwrite', async ({ counters }) => {
    await requestToPromise(counters.clear())
    for (const counter of nextCounters) {
      await requestToPromise(counters.put(counter))
    }
  })
}

export const clearAllLocalData = async (): Promise<void> => {
  await withTransaction('readwrite', async ({ counters, meta }) => {
    await requestToPromise(counters.clear())
    await requestToPromise(meta.clear())
  })
}
