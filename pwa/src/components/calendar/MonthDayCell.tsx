import { useState, useRef, useLayoutEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useProductTourContext } from "../tour/ProductTourContext";

interface MonthDayCellProps {
  date: Dayjs;
  isToday: boolean;
  dayEvents: any[];
  openDayView: (date: Dayjs) => void;
}

export function MonthDayCell({
  date,
  isToday,
  dayEvents,
  openDayView,
}: MonthDayCellProps) {
  const { activeStep, isRunning, nextStep } = useProductTourContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxVisible, setMaxVisible] = useState<number>(2); // 預設 2 個

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cellHeight = entry.contentRect.height;

        // 扣除頂部日期數字 (約 24px) 與 "+N 更多" 提示 (約 18px)
        const availableHeight = cellHeight - 24 - 18;
        const itemHeight = 20; // 單個事件卡片的高度 + gapMargin (約 20px)

        // 計算可放下的卡片數量，最少保證顯示 1 個
        const calculatedMax = Math.max(
          1,
          Math.floor(availableHeight / itemHeight),
        );
        setMaxVisible(calculatedMax);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const visibleEvents = dayEvents.slice(0, maxVisible);
  const extraCount = dayEvents.length - visibleEvents.length;

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      data-tour="month-day-cell"
      onClick={() => {
        openDayView(date);
        if (isRunning && activeStep?.id === "month-day-cell") {
          nextStep();
        }
      }}
      className="bg-white p-1 flex flex-col hover:bg-blue-50/40 transition cursor-pointer group h-full overflow-hidden select-none"
    >
      {/* 頂部日期數字與總數 */}
      <div className="flex justify-between items-center mb-1 shrink-0 h-5">
        <span
          className={`text-xs font-semibold inline-flex items-center justify-center w-5 h-5 rounded-full ${
            isToday
              ? "bg-blue-600 text-white font-bold"
              : "text-gray-700 group-hover:text-blue-600"
          }`}
        >
          {date.date()}
        </span>
        {dayEvents.length > 0 && (
          <span className="text-[10px] text-gray-400 font-normal">
            {dayEvents.length}項
          </span>
        )}
      </div>

      {/* 動態渲染計算出來的事件數量 */}
      <div className="flex-1 space-y-0.5 overflow-hidden">
        {visibleEvents.map((item) => (
          <div
            key={item.taskId}
            className="text-[10px] px-1 py-0.5 rounded truncate leading-tight border border-black/5"
            style={{
              backgroundColor: item.sourceColor || "transparent",
              color: item.sourceColor ? "#ffffff" : "inherit",
            }}
            title={item.title}
          >
            {item.title || "無標題"}
          </div>
        ))}

        {/* 超出數量的 "+N 更多" */}
        {extraCount > 0 && (
          <div className="text-[9px] text-blue-600 font-semibold px-0.5 truncate leading-tight">
            +{extraCount} 更多...
          </div>
        )}
      </div>
    </div>
  );
}
