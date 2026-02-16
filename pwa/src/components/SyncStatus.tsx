import { useEffect, useState } from 'react'
import { db } from '../db/index'

interface SyncStatusProps {
  syncStatus?: 'idle' | 'syncing' | 'error'
}

export function SyncStatus({ syncStatus = 'idle' }: SyncStatusProps) {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // 取得待同步的 change log 數量
    db.change_log
      .where('status')
      .equals('pending')
      .count()
      .then(setPendingCount)
  }, [])

  const statusIcon: Record<string, string> = {
    idle: '✅',
    syncing: '🔄',
    error: '⚠️',
  }

  const statusText: Record<string, string> = {
    idle: pendingCount > 0 ? `Pending ${pendingCount}` : 'Synced',
    syncing: 'Syncing...',
    error: 'Sync Error',
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span>{statusIcon[syncStatus]}</span>
      <span>{statusText[syncStatus]}</span>
    </div>
  )
}
