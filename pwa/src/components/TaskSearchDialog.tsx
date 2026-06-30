import { useState, useEffect, useMemo } from 'react'
import { db, applyChange } from '../db/index'
import type { SelectionCacheItem } from '../db/schema'
import { interruptTask } from '../utils/taskFlow'
import { useAppStore } from '../store/appStore'
import { useT } from '../i18n'
import Utils from '../../../gas/src/Utils'
import type { SheetName } from '../hooks/useUrlAction'

const DEV_CLIENT_ID = 'task-search-dialog'

type AddTarget = 'Task_Pool' | 'Micro_Tasks' | 'Scheduled'

interface SearchResult {
  taskId: string
  title: string
  source: AddTarget
  status?: string
  url?: string
  deadline?: number
}

function toSelectionCandidate(item: SearchResult): SelectionCacheItem {
  return {
    taskId: item.taskId,
    title: item.title,
    source: item.source,
    status: item.status,
    url: item.url,
    deadline: item.deadline,
  }
}

const tableMap: Record<AddTarget, string> = {
  Task_Pool: 'task_pool',
  Micro_Tasks: 'micro_tasks',
  Scheduled: 'scheduled',
}

const sheetMap: Record<AddTarget, SheetName> = {
  Task_Pool: 'task_pool',
  Micro_Tasks: 'micro_tasks',
  Scheduled: 'scheduled',
}

function generateNewId(target: AddTarget): string {
  if (target === 'Task_Pool') return Utils.generateId('T')
  if (target === 'Micro_Tasks') return Utils.generateId('t')
  return Utils.generateId('S')
}

function createNewPatch(target: AddTarget, taskId: string, title: string): Record<string, unknown> {
  const base: Record<string, unknown> = { taskId, title, status: 'PENDING' }
  if (target === 'Scheduled') base.cronExpr = ''
  return base
}

export function TaskSearchDialog() {
  const t = useT()
  const showTaskSearchDialog = useAppStore((state) => state.showTaskSearchDialog)
  const setShowTaskSearchDialog = useAppStore((state) => state.setShowTaskSearchDialog)
  const taskSearchInitQuery = useAppStore((state) => state.taskSearchInitQuery)
  const setTaskSearchInitQuery = useAppStore((state) => state.setTaskSearchInitQuery)
  const loadRunningTask = useAppStore((state) => state.loadRunningTask)
  const setCurrentSheet = useAppStore((state) => state.setCurrentSheet)
  const setPendingEditIntent = useAppStore((state) => state.setPendingEditIntent)

  const [query, setQuery] = useState('')
  const [allResults, setAllResults] = useState<SearchResult[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [regexError, setRegexError] = useState<string | null>(null)
  const [addTarget, setAddTarget] = useState<AddTarget>('Micro_Tasks')
  const [addChecked, setAddChecked] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!showTaskSearchDialog) return
    setQuery(taskSearchInitQuery)
    setSelectedId(null)
    setRegexError(null)
    setAddChecked(false)
    setAdding(false)

    setLoadingData(true)
    Promise.all([
      db.task_pool.toArray(),
      db.micro_tasks.toArray(),
      db.scheduled.toArray(),
    ]).then(([pool, micro, sched]) => {
      const results: SearchResult[] = [
        ...pool.map((i) => ({
          taskId: i.taskId,
          title: i.title || '',
          source: 'Task_Pool' as const,
          status: i.status,
          url: i.url,
          deadline: i.deadline,
        })),
        ...micro.map((i) => ({
          taskId: i.taskId,
          title: i.title || '',
          source: 'Micro_Tasks' as const,
          status: i.status,
          url: i.url,
          deadline: i.deadline,
        })),
        ...sched.map((i) => ({
          taskId: i.taskId,
          title: i.title || '',
          source: 'Scheduled' as const,
          status: i.status,
          url: i.url,
          deadline: i.deadline,
        })),
      ]
      setAllResults(results)
      setLoadingData(false)
    })
  }, [showTaskSearchDialog, taskSearchInitQuery])

  const filteredResults = useMemo(() => {
    if (!query.trim()) return []
    try {
      const regex = new RegExp(query, 'i')
      setRegexError(null)
      return allResults.filter((r) => regex.test(r.title))
    } catch {
      setRegexError(t('taskSearch.invalidRegex'))
      return []
    }
  }, [query, allResults, t])

  const selectedItem = filteredResults.find((r) => r.taskId === selectedId) ?? null

  const handleClose = () => {
    setShowTaskSearchDialog(false)
    setTaskSearchInitQuery('')
  }

  const handleEdit = () => {
    if (!selectedItem) return
    const sheet = sheetMap[selectedItem.source]
    setPendingEditIntent({ sheet, taskId: selectedItem.taskId })
    setCurrentSheet(sheet)
    handleClose()
  }

  const handleRun = async () => {
    if (!selectedItem) return
    const result = await interruptTask('', toSelectionCandidate(selectedItem))
    if (result.status !== 'success') {
      console.error('Failed to switch task:', result.message)
      return
    }
    await loadRunningTask()
    handleClose()
  }

  const handleAddAndEdit = async () => {
    setAdding(true)
    try {
      const taskId = generateNewId(addTarget)
      const patch = createNewPatch(addTarget, taskId, query.trim())
      await applyChange({
        table: tableMap[addTarget],
        recordId: taskId,
        op: 'add',
        patch,
        clientId: DEV_CLIENT_ID,
      })
      const sheet = sheetMap[addTarget]
      setPendingEditIntent({ sheet, taskId })
      setCurrentSheet(sheet)
      handleClose()
    } finally {
      setAdding(false)
    }
  }

  const handleAddAndRun = async () => {
    setAdding(true)
    try {
      const taskId = generateNewId(addTarget)
      const patch = createNewPatch(addTarget, taskId, query.trim())
      await applyChange({
        table: tableMap[addTarget],
        recordId: taskId,
        op: 'add',
        patch,
        clientId: DEV_CLIENT_ID,
      })
      const candidate: SelectionCacheItem = {
        taskId,
        title: query.trim(),
        source: addTarget,
        status: 'PENDING',
      }
      const result = await interruptTask('', candidate)
      if (result.status !== 'success') {
        console.error('Failed to run new task:', result.message)
        return
      }
      await loadRunningTask()
      handleClose()
    } finally {
      setAdding(false)
    }
  }

  if (!showTaskSearchDialog) return null

  const hasQuery = !!query.trim()
  const hasResults = filteredResults.length > 0
  const showNoResults = hasQuery && !hasResults && !regexError

  const sourceLabel: Record<AddTarget, string> = {
    Task_Pool: t('taskSearch.source.taskPool'),
    Micro_Tasks: t('taskSearch.source.microTasks'),
    Scheduled: t('taskSearch.source.scheduled'),
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{t('taskSearch.title')}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 pt-3 pb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedId(null)
            }}
            placeholder={t('taskSearch.placeholder')}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 text-sm"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {regexError && <p className="mt-1 text-xs text-red-500">{regexError}</p>}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {loadingData ? (
            <p className="text-sm text-gray-400 text-center py-4">{t('candidates.loading')}</p>
          ) : hasResults ? (
            <ul className="space-y-1">
              {filteredResults.map((item) => (
                <li key={item.taskId}>
                  <label className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="taskSearch"
                      checked={selectedId === item.taskId}
                      onChange={() => setSelectedId(item.taskId)}
                      className="accent-blue-500"
                    />
                    <span className="flex-1 text-sm">{item.title || '(untitled)'}</span>
                    <span className="text-xs text-gray-400">{sourceLabel[item.source]}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : showNoResults ? (
            <div className="py-4">
              <p className="text-sm text-gray-500 text-center mb-3">{t('taskSearch.noResults')}</p>
              {/* Add to section */}
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={addChecked}
                  onChange={(e) => setAddChecked(e.target.checked)}
                  className="accent-blue-500"
                />
                <span>{t('taskSearch.addTo')}</span>
                <select
                  value={addTarget}
                  onChange={(e) => setAddTarget(e.target.value as AddTarget)}
                  className="ml-1 border rounded px-2 py-1 text-sm"
                >
                  <option value="Micro_Tasks">{t('taskSearch.source.microTasks')}</option>
                  <option value="Task_Pool">{t('taskSearch.source.taskPool')}</option>
                  <option value="Scheduled">{t('taskSearch.source.scheduled')}</option>
                </select>
              </label>
              {addChecked && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddAndEdit}
                    disabled={adding}
                    className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {adding ? t('taskSearch.adding') : t('taskSearch.addAndEdit')}
                  </button>
                  {addTarget !== 'Scheduled' && (
                    <button
                      onClick={handleAddAndRun}
                      disabled={adding}
                      className="flex-1 px-3 py-2 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                    >
                      {adding ? t('taskSearch.adding') : t('taskSearch.addAndRun')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer actions when item is selected */}
        {selectedItem && (
          <div className="px-4 py-3 border-t flex gap-2">
            <button
              onClick={handleEdit}
              className="flex-1 px-3 py-2 text-sm border border-blue-400 text-blue-700 rounded hover:bg-blue-50"
            >
              ✏️ {t('taskSearch.editBtn')}
            </button>
            <button
              onClick={handleRun}
              className="flex-1 px-3 py-2 text-sm bg-amber-500 text-white rounded hover:bg-amber-600"
            >
              ▶ {t('taskSearch.runBtn')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
