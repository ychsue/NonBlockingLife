import { useAppStore } from '../store/appStore'
import { SheetName } from '../hooks/useUrlAction'

type AllPages = SheetName | 'selection_cache' | 'log' | 'guide' | 'macro'

const TABS: { sheet: AllPages; label: string; icon: string }[] = [
  { sheet: 'inbox', label: 'Inbox', icon: '📭' },
  { sheet: 'selection_cache', label: 'Candidates', icon: '🎯' },
  { sheet: 'task_pool', label: 'Task Pool', icon: '📋' },
  { sheet: 'scheduled', label: 'Scheduled', icon: '📅' },
  { sheet: 'micro_tasks', label: 'Micro Tasks', icon: '✓' },
  { sheet: 'log', label: 'Log', icon: '🧾' },
  { sheet: 'resource', label: 'Resources', icon: '📚' },
  { sheet: 'macro', label: 'Macros', icon: '🧩' },
  { sheet: 'guide', label: 'Guide', icon: '📘' },
]

// sheet name of experimental features that are not yet fully released to users
const EXPERIMENTAL_TABS: string[] = ['macro', 'debug']

export function TabNavigation() {
  const currentSheet = useAppStore((state) => state.currentSheet)
  const setCurrentSheet = useAppStore((state) => state.setCurrentSheet)
  const experimentalFeaturesEnabled = useAppStore((state) => state.experimentalFeaturesEnabled)

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex gap-1 px-4 py-2 overflow-x-auto">
        {TABS.filter(({ sheet }) => !EXPERIMENTAL_TABS.includes(sheet) || experimentalFeaturesEnabled).map(({ sheet, label, icon }) => (
          <button
            key={sheet}
            onClick={() => setCurrentSheet(sheet)}
            className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-md border-b-2 transition-colors ${
              currentSheet === sheet
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="mr-1">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
