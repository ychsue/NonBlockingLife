import 'fake-indexeddb/auto'
import { db } from '../schema.js'
import { applyChange, getPendingChangeLogs } from '../changeLog.js'

describe('changeLog', () => {
  beforeEach(async () => {
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('writes add operation and change log entry', async () => {
    const id = await applyChange({
      table: 'inbox',
      recordId: 'T001',
      op: 'add',
      patch: { title: 'Idea A', receivedAt: 1000 },
      clientId: 'client-1'
    })

    const row = await db.inbox.get('T001')
    const logs = await getPendingChangeLogs()

    expect(row).toBeTruthy()
    expect(row?.title).toBe('Idea A')
    expect(logs.length).toBe(1)
    expect(logs[0].id).toBe(id)
    expect(logs[0].status).toBe('pending')
  })

  it('writes update operation and change log entry', async () => {
    await db.inbox.add({ taskId: 'T002', title: 'Old', receivedAt: 2000 })

    await applyChange({
      table: 'inbox',
      recordId: 'T002',
      op: 'update',
      patch: { title: 'New' },
      clientId: 'client-1'
    })

    const row = await db.inbox.get('T002')
    const logs = await getPendingChangeLogs()

    expect(row?.title).toBe('New')
    expect(logs.length).toBe(1)
    expect(logs[0].op).toBe('update')
  })

  it('writes delete operation and change log entry', async () => {
    await db.inbox.add({ taskId: 'T003', title: 'Gone', receivedAt: 3000 })

    await applyChange({
      table: 'inbox',
      recordId: 'T003',
      op: 'delete',
      patch: {},
      clientId: 'client-1'
    })

    const row = await db.inbox.get('T003')
    const logs = await getPendingChangeLogs()

    expect(row).toBeUndefined()
    expect(logs.length).toBe(1)
    expect(logs[0].op).toBe('delete')
  })
})
