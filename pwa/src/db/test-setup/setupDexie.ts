import { indexedDB, IDBKeyRange } from 'fake-indexeddb'

globalThis.indexedDB = indexedDB
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).IDBKeyRange = IDBKeyRange
