import { useEffect, useState } from 'react'
import { db, type AppLogEntry, type AppLogLevel } from '../../db/schema'
import { useAppStore } from '../../store/appStore'

const LEVELS: Array<AppLogLevel | 'all'> = ['all', 'error', 'warn', 'info']

export function DebugLogPage() {
  const debugMode = useAppStore((state) => state.debugMode)
  const setDebugMode = useAppStore((state) => state.setDebugMode)
  const [rows, setRows] = useState<AppLogEntry[]>([])
  const [levelFilter, setLevelFilter] = useState<AppLogLevel | 'all'>('all')

  const loadLogs = async () => {
    const data = await db.app_log.orderBy('timestamp').reverse().toArray()
    setRows(data)
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  const filteredRows = rows.filter((row) => levelFilter === 'all' || row.level === levelFilter)

  const clearLogs = async () => {
    await db.app_log.clear()
    await loadLogs()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Debug Logs</h2>
            <p className="text-sm text-gray-500">Errors are always recorded. Info and warn are recorded only when debug mode is enabled.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
              />
              Debug mode
            </label>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as AppLogLevel | 'all')}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>

            <button onClick={() => void loadLogs()} className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
              Refresh
            </button>
            <button onClick={() => void clearLogs()} className="rounded bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600">
              Clear Logs
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {filteredRows.length === 0 ? (
          <div className="text-sm text-gray-500">No logs yet.</div>
        ) : (
          <div className="space-y-3">
            {filteredRows.map((row) => (
              <div key={row.id} className="rounded border border-gray-100 bg-gray-50 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="rounded bg-gray-200 px-2 py-0.5 uppercase">{row.level}</span>
                  <span>{row.scope}</span>
                  <span>{new Date(row.timestamp).toLocaleString()}</span>
                </div>
                <div className="mt-2 text-sm text-gray-800">{row.message}</div>
                {row.payload && (
                  <pre className="mt-2 overflow-auto rounded border border-gray-200 bg-white p-2 text-xs">
                    {JSON.stringify(row.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}