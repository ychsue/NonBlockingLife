import 'fake-indexeddb/auto'
import { db } from '../schema.js'
import { applyChange } from '../changeLog.js'
import { uploadPendingChanges } from '../sync.js'

describe('sync', () => {
  beforeEach(async () => {
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('uploads pending changes and marks them synced', async () => {
    const id = await applyChange({
      table: 'inbox',
      recordId: 'T100',
      op: 'add',
      patch: { title: 'Sync Me', receivedAt: 1000 },
      clientId: 'client-1'
    })

    const sendBatch = async () => ({ successIds: [id] })
    const result = await uploadPendingChanges({ sendBatch })

    const log = await db.change_log.get(id)

    expect(result.uploaded).toBe(1)
    expect(result.failed).toBe(0)
    expect(log?.status).toBe('synced')
  })

  it('marks failed changes when upload fails', async () => {
    const id = await applyChange({
      table: 'inbox',
      recordId: 'T200',
      op: 'add',
      patch: { title: 'Fail Me', receivedAt: 2000 },
      clientId: 'client-1'
    })

    const sendBatch = async () => ({ successIds: [] })
    const result = await uploadPendingChanges({ sendBatch })

    const log = await db.change_log.get(id)

    expect(result.uploaded).toBe(0)
    expect(result.failed).toBe(1)
    expect(log?.status).toBe('failed')
    expect(log?.retryCount).toBe(1)
  })
})
