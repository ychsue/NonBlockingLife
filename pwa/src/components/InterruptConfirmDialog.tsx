import { useT } from '../i18n'

interface InterruptConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onImmediateInterrupt: () => Promise<void>
  onTaskSearch: () => void
}

export function InterruptConfirmDialog({
  isOpen,
  onClose,
  onImmediateInterrupt,
  onTaskSearch,
}: InterruptConfirmDialogProps) {
  const t = useT()

  if (!isOpen) return null

  const handleImmediateInterrupt = async () => {
    await onImmediateInterrupt()
    onClose()
  }

  const handleTaskSearch = () => {
    onClose()
    onTaskSearch()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-800">⚡ {t('interrupt.confirm.title')}</h2>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <button
            onClick={handleTaskSearch}
            className="w-full px-4 py-3 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔍 {t('interrupt.confirm.search')}
          </button>
          <button
            onClick={handleImmediateInterrupt}
            className="w-full px-4 py-3 text-sm border border-amber-300 text-amber-800 rounded hover:bg-amber-100"
          >
            ⚡ {t('interrupt.confirm.immediate')}
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-sm text-gray-600 rounded hover:bg-gray-100"
          >
            {t('interrupt.confirm.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
