import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

interface TableHelpDialogProps {
  isOpen: boolean
  title: string
  markdown: string
  onClose: () => void
}

export function TableHelpDialog({
  isOpen,
  title,
  markdown,
  onClose,
}: TableHelpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg w-full max-w-2xl"
      style={{ padding: 0 }}
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="bg-white rounded-lg shadow-lg p-5">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="ml-auto px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
          >
            關閉
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto pr-1 text-sm leading-relaxed text-gray-800 space-y-2">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mb-3">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>
              ),
              p: ({ children }) => <p className="mb-2">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc ml-5 mb-2 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal ml-5 mb-2 space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              code: ({ children }) => (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                  {children}
                </code>
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </dialog>
  )
}
