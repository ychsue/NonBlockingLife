import { UnifiedCalendarItem } from "../../utils/icsAdapter";
import { useState } from "react";
import { isCronExprDuringInterval } from "../../utils/isCronExprDuringInterval";
import dayjs from "dayjs";
import { TableCard, TableCardProps } from "../TableCard";
import { useT, useTWithMaps } from "../../i18n";

export type DayViewProps = {
  items: UnifiedCalendarItem[];
  initialDate?: Date;
  onEdit: TableCardProps<UnifiedCalendarItem>["onEdit"];
  onAddNewItem: (taskId?: string, title?: string, nextRun?: number) => void;
  onDelete: TableCardProps<UnifiedCalendarItem>["onDelete"];
  onClose: () => void;
  quickAction?: TableCardProps<UnifiedCalendarItem>["quickAction"];
};

/**
 * 參照 [ScheduledTable.tsx](pwa\src\components\tables\ScheduledTable.tsx)
 * | 視圖層級 | 導航欄 (Header) | 核心渲染區 (Content) | 點擊格/標題動作 | 點擊事件動作 |
 * | **日視圖** | `[<] 2026-09-18 [>]` + `[今天]` | 垂直時間排序的 `TableCard` 清單 | 點擊空白處/新增按鈕 $\rightarrow$ 打開預填日期的 `EditDialog`<br> | 點擊卡片 $\rightarrow$ 打開 `TableCard` 詳情 / 編輯 Modal|
 */
export function DayView({
  items,
  initialDate = new Date(),
  onEdit,
  onAddNewItem,
  onDelete,
  onClose,
  quickAction,
}: DayViewProps) {
  const t = useT();
  const [selectedDate, setSelectedDate] = useState(dayjs(initialDate));
  const today = dayjs();

  const tHere = useTWithMaps({
    "zh-TW": {
      日曆: "日曆",
      item數量: "{count} 項",
      今天: "今天",
      新增: "新增",
      今天沒有排定的事項: "今天沒有排定的事項",
    },
    en: {
      日曆: "Calendar",
      item數量: "{count}",
      今天: "Today",
      新增: "New",
      今天沒有排定的事項: "No items scheduled for today",
    },
    ja: {
      日曆: "カレンダー",
      item數量: "{count} 件",
      今天: "今日",
      新增: "新規",
      今天沒有排定的事項: "今日の予定はありません",
    },
  });

  // 篩選當日項目並依時間排序
  const dayItems = items
    .filter((item) => {
      let isInside = dayjs(item.nextRun).isSame(selectedDate, "day");
      if (!!!isInside && item.cronExpr) {
        // 若他有 rrule或 cron 表達式，則需要額外判斷是否在當日內
        isInside = isCronExprDuringInterval(
          item.cronExpr,
          new Date(item.nextRun ?? Date.now()),
          selectedDate.startOf("day").toDate(),
          selectedDate.endOf("day").toDate(),
        );
      }
      return isInside;
    })
    .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));

  return (
    // 由導覽列與內容區(TableCard 清單)組成，上面導覽列，下面全部給內容區填滿
    <div className="flex flex-col h-full w-full bg-white text-gray-800 rounded-lg">
      {/* 頂部導覽列 Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-gray-200 flex-wrap gap-2 bg-gray-50/50 shrink-0"
        data-tour="day-view-header"
      >
        {/* 左側：標題與今天按鈕 */}
        <div className="flex items-center gap-3">
          <button
            className="px-2 py-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-md transition"
            onClick={onClose}
          >
            ✕
          </button>
          <h3 className="text-lg font-bold text-gray-800">{tHere("日曆")}</h3>
          {dayItems.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {tHere("item數量", { count: dayItems.length })}
            </span>
          )}
          <button
            className="px-2.5 py-1 text-xs bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition shadow-xs"
            onClick={() => setSelectedDate(today)}
          >
            {tHere("今天")}
          </button>
        </div>

        {/* 中間：日期切換選單 */}
        <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-xs py-0.5">
          <button
            className="px-2 text-gray-600 hover:bg-white rounded transition font-bold"
            onClick={() => setSelectedDate(selectedDate.subtract(1, "day"))}
          >
            &lt;
          </button>
          <input
            type="date"
            className="bg-transparent font-semibold text-gray-700 focus:outline-none"
            value={selectedDate.format("YYYY-MM-DD")}
            onChange={(e) =>
              e.target.value && setSelectedDate(dayjs(e.target.value))
            }
          />
          <button
            className="px-2 text-gray-600 hover:bg-white rounded transition font-bold"
            onClick={() => setSelectedDate(selectedDate.add(1, "day"))}
          >
            &gt;
          </button>
        </div>

        {/* 右側：動作按鈕 */}
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition shadow-xs flex items-center gap-1"
            onClick={() =>
              onAddNewItem(
                undefined,
                selectedDate.format("YYYY-MM-DD"),
                selectedDate.valueOf(),
              )
            }
          >
            <span>+</span> {tHere("新增")}
          </button>
        </div>
      </div>
      <div
        className="flex-1  overflow-y-auto py-2 space-y-3"
        data-tour="day-view-content"
      >
        {" "}
        {/*flex-wrap grid gap-0 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] place-items-stretch auto-rows-[minmax(0,auto)]"> */}
        {dayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <span className="text-4xl mb-2">📅</span>
            <p className="text-sm">({tHere("今天沒有排定的事項")})</p>
          </div>
        ) : (
          dayItems.map((item) => (
            <TableCard
              key={item.taskId}
              item={item}
              accentColor={item.sourceColor}
              onEdit={onEdit}
              showDelete={item.itemType === "scheduled"}
              onDelete={onDelete}
              quickAction={quickAction}
              compact={true}
              fields={[
                {
                  label: t("card.nextRun"),
                  value: (
                    <div>
                      {
                        <div className="text-sm font-bold">
                          {dayjs(item.nextRun).format("HH:mm")}
                        </div>
                      }
                      {item.focusTime && <div>{item.focusTime}</div>}
                    </div>
                  ),
                },
                {
                  label: t("col.title"),
                  value: item.title || t("table.empty"),
                  className: "bg-blue-100 rounded",
                },
                //如果有 SourceName 就插入
                ...(item.sourceName
                  ? [
                      {
                        label: t("card.sourceName"),
                        value: item.sourceName,
                        className: "bg-gray-100 rounded",
                      },
                    ]
                  : []),
                {
                  label: t("card.status"),
                  value: item.status,
                  className: "bg-green-100 rounded",
                },
              ]}
            />
          ))
        )}
      </div>
    </div>
  );
}
