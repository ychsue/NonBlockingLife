import { useState } from 'react'
import { useUrlAction, SheetName } from './hooks/useUrlAction'
import { TabNavigation } from './components/TabNavigation'
import { Toast } from './components/Toast'
import { SyncStatus } from './components/SyncStatus'
import { InboxTable } from './components/tables/InboxTable'
import { TaskPoolTable } from './components/tables/TaskPoolTable'
import { ScheduledTable } from './components/tables/ScheduledTable'
import { MicroTasksTable } from './components/tables/MicroTasksTable'
import { db } from './db/index'
import './styles.css'

export default function App() {
  const [currentSheet, setCurrentSheet] = useState<SheetName>('inbox')
  const [toast, setToast] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // 監聽 iPhone Shortcut URL 參數
  useUrlAction({
    onNavigate: setCurrentSheet,
    onSuccess: setToast,
    clientId: 'iphone-webkit',
  })

  const renderTable = () => {
    switch (currentSheet) {
      case 'inbox':
        return <InboxTable />
      case 'task_pool':
        return <TaskPoolTable />
      case 'scheduled':
        return <ScheduledTable />
      case 'micro_tasks':
        return <MicroTasksTable />
      default:
        return <InboxTable />
    }
  }

  const handleResetDB = async () => {
    await db.transaction(
      'rw',
      [
        db.log,
        db.dashboard,
        db.inbox,
        db.task_pool,
        db.scheduled,
        db.selection_cache,
        db.micro_tasks,
        db.change_log,
        db.sync_state,
      ],
      async () => {
        await Promise.all([
          db.log.clear(),
          db.dashboard.clear(),
          db.inbox.clear(),
          db.task_pool.clear(),
          db.scheduled.clear(),
          db.selection_cache.clear(),
          db.micro_tasks.clear(),
          db.change_log.clear(),
          db.sync_state.clear(),
        ])
      }
    )

    setToast('✅ Database reset successfully')
    setShowResetConfirm(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📱 Non-Blocking Life</h1>
            <p className="text-sm text-gray-600">Local-first Task Management</p>
          </div>
          <SyncStatus />
        </div>
      </header>

      {/* Tabs */}
      <TabNavigation currentSheet={currentSheet} onSelectSheet={setCurrentSheet} />

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        {renderTable()}
      </main>

      {/* Footer with Dev Tools */}
      {import.meta.env.DEV && (
        <footer className="border-t border-gray-200 bg-white p-4 flex justify-end gap-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            ⚠️ Reset DB (Dev)
          </button>
        </footer>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-bold text-red-600 mb-2">
              ⚠️ Reset Database?
            </h3>
            <p className="text-gray-600 mb-4">
              This will delete all data. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDB}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast}
          duration={3000}
          onClose={() => setToast('')}
        />
      )}
    </div>
  )
}
