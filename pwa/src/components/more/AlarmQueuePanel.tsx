import type { AlarmQueueItem } from '../../db/schema'
import { triggerAlarmNotification } from '../../utils/alarmNotifications'

interface AlarmQueuePanelProps {
  items: AlarmQueueItem[]
  onRefresh: () => Promise<void>
  onTrigger: (item: AlarmQueueItem) => Promise<boolean>
  onDismiss: (item: AlarmQueueItem) => Promise<boolean>
  onDelete: (item: AlarmQueueItem) => Promise<boolean>
}

export function AlarmQueuePanel({
  items,
  onRefresh,
  onTrigger,
  onDismiss,
  onDelete,
}: AlarmQueuePanelProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-gray-900">Alarm queue</h4>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500">No alarm queue entries yet.</div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item) => (
            <div key={item.id ?? item.dedupeKey} className="rounded border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{item.title ?? item.taskId}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(item.alarmAt).toLocaleString()} · {item.state}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    offset: {item.offsetMinutes} min · taskId: {item.taskId}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    clock: {item.clockState} · exact: {item.exactState}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onTrigger(item)}
                    className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                  >
                    Trigger
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDismiss(item)}
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(item)}
                    className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
