import type { ChangeLogEntry } from './schema.js'
import type { FetchRemoteFn, SendBatchFn, SendBatchResult } from './sync.js'

export const sendBatchStub: SendBatchFn = async (
  _grouped: Record<string, ChangeLogEntry[]>
): Promise<SendBatchResult> => {
  throw new Error('sendBatch is not implemented yet.')
}

export const fetchRemoteStub: FetchRemoteFn = async (): Promise<Array<{ table: string; data: unknown }>> => {
  throw new Error('fetchRemote is not implemented yet.')
}
