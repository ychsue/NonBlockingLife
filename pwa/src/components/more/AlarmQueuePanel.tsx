import type { AlarmQueueItem } from "../../db/schema";
import { minutesToTimeString } from "../../utils/candidateUtils";

interface AlarmQueuePanelProps {
  items: AlarmQueueItem[];
  onClearQueue: () => Promise<void>;
  onUpdateItems: () => Promise<void>;
}

export function AlarmQueuePanel({
  items,
  onClearQueue,
  onUpdateItems,
}: AlarmQueuePanelProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-gray-900">Alarm queue</h4>
        {import.meta.env.DEV ? (
          <button
            type="button"
            onClick={() => void onClearQueue()}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Clear Queue
          </button>
        ) : null}
        <button
          type="button"
          onClick={onUpdateItems}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          更新鬧鐘序列
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500">No alarm queue entries yet.</div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item) => (
            <div
              key={item.id ?? item.dedupeKey}
              className="rounded border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {item.title ?? item.taskId}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(item.alarmAt).toLocaleString()} · {item.state}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    offset: {minutesToTimeString(item.offsetMinutes)}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500 flex gap-4 flex-row">
                    <p
                      className={`${item.clockState === "not_applicable" ? "line-through" : ""}`}
                    >
                      ⏰: {item.clockState} {item.clockState === "set"? "✅" : item.clockState === "failed" ? "❌" : "　"}
                    </p>
                    ·
                    <p
                      className={`${item.exactState === "not_applicable" ? "line-through" : ""}`}
                    >
                      🪧: {item.exactState} {item.exactState === "set"? "✅" : item.exactState === "failed" ? "❌" : item.exactState === "forbidden" ? "🚫" : "❓"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
