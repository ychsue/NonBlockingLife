import { SheetName } from '../hooks/useUrlAction'

type AllPages = SheetName | 'selection_cache'

interface TabNavigationProps {
  currentSheet: AllPages
  onSelectSheet: (sheet: AllPages) => void
}

const TABS: { sheet: AllPages; label: string; icon: string }[] = [
  { sheet: 'inbox', label: 'Inbox', icon: '📭' },
  { sheet: 'task_pool', label: 'Task Pool', icon: '📋' },
  { sheet: 'scheduled', label: 'Scheduled', icon: '📅' },
  { sheet: 'micro_tasks', label: 'Micro Tasks', icon: '✓' },
  { sheet: 'selection_cache', label: 'Candidates', icon: '🎯' },
]

export function TabNavigation({
  currentSheet,
  onSelectSheet,
}: TabNavigationProps) {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="flex gap-1 px-4 py-2 overflow-x-auto">
        {TABS.map(({ sheet, label, icon }) => (
          <button
            key={sheet}
            onClick={() => onSelectSheet(sheet)}
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
