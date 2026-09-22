import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import type { DayViewProps } from "./DayView";
import _ from "lodash";
import { isCronExprDuringInterval } from "../../utils/isCronExprDuringInterval";
import { MonthDayCell } from "./MonthDayCell";
import { useProductTourContext } from "../tour/ProductTourContext";
import { useTWithMaps } from "../../i18n";

export interface MonthViewProps extends DayViewProps {
  openDayView: (date: Dayjs) => void;
}

export function MonthView({
  items,
  initialDate = new Date(),
  onAddNewItem,
  openDayView,
  onClose,
}: MonthViewProps) {
  const { activeStep, isRunning, nextStep } = useProductTourContext();

  const [selectedMonth1stDate, setSelectedMonth1stDate] = useState(
    initialDate
      ? dayjs(initialDate).startOf("month")
      : dayjs().startOf("month"),
  );
  const [groupOfThisMonth, setGroupOfThisMonth] = useState<
    Record<number, typeof items>
  >({});

  const tHere = useTWithMaps({
    "zh-TW": {
      月曆: "月曆",
      item數量: "{count} 項",
      本月份: "本月份",
      n年: "{year}年",
      n月: "{month}月",
      新增: "新增",
      日: "日",
      一: "一",
      二: "二",
      三: "三",
      四: "四",
      五: "五",
      六: "六",
    },
    en: {
      月曆: "Monthly",
      item數量: "{count}",
      本月份: "This Month",
      n年: "{year}年",
      n月: "{month}",
      新增: "New",
      日: "Sun",
      一: "Mon",
      二: "Tue",
      三: "Wed",
      四: "Thu",
      五: "Fri",
      六: "Sat",
    },
    ja: {
      月曆: "カレンダー",
      item數量: "{count} 件",
      本月份: "今月",
      n年: "{year}年",
      n月: "{month}月",
      新增: "新規",
      日: "日",
      一: "月",
      二: "火",
      三: "水",
      四: "木",
      五: "金",
      六: "土",
    },
  });

  const endOfMonthDate = selectedMonth1stDate.endOf("month");
  const today = dayjs();

  useEffect(() => {
    const groupOfThisMonth: Record<number, typeof items> = {};
    items
      .filter((item) => item.nextRun && dayjs(item.nextRun).isValid())
      .forEach((item) => {
        const nextRun = dayjs(item.nextRun);
        if (
          !item.cronExpr &&
          nextRun.isSame(selectedMonth1stDate, "year") &&
          nextRun.isSame(selectedMonth1stDate, "month")
        ) {
          if (!groupOfThisMonth[nextRun.date()]) {
            groupOfThisMonth[nextRun.date()] = [];
          }
          groupOfThisMonth[nextRun.date()].push(item);
        } else if (item.cronExpr) {
          for (
            let day = selectedMonth1stDate.startOf("month");
            day.isBefore(endOfMonthDate) || day.isSame(endOfMonthDate, "day");
            day = day.add(1, "day")
          ) {
            const isInside = isCronExprDuringInterval(
              item.cronExpr,
              nextRun.toDate(),
              day.startOf("day").toDate(),
              day.endOf("day").toDate(),
            );
            if (isInside) {
              if (!groupOfThisMonth[day.date()]) {
                groupOfThisMonth[day.date()] = [];
              }
              groupOfThisMonth[day.date()].push(item);
            }
          }
        }
      });
    setGroupOfThisMonth(groupOfThisMonth);
  }, [items, selectedMonth1stDate]);

  const totalEventsThisMonth = _.sum(
    Object.values(groupOfThisMonth).map((arr) => arr.length),
  );

  const startDayOfWeek = selectedMonth1stDate.day();
  const daysInMonth = selectedMonth1stDate.daysInMonth();

  const prevMonthDays = _.range(0, startDayOfWeek).map((i) =>
    selectedMonth1stDate.subtract(startDayOfWeek - i, "day"),
  );

  const currentMonthDays = _.range(1, daysInMonth + 1).map((day) =>
    selectedMonth1stDate.date(day),
  );

  const totalCellsSoFar = prevMonthDays.length + currentMonthDays.length;
  const totalGridCells = totalCellsSoFar > 35 ? 42 : 35;
  const nextMonthDays = _.range(1, totalGridCells - totalCellsSoFar + 1).map(
    (day) => selectedMonth1stDate.add(1, "month").date(day),
  );

  return (
    <div className="flex flex-col h-full w-full bg-white text-gray-800 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 頂部 Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-gray-200 flex-wrap gap-2 bg-gray-50/50 shrink-0"
        data-tour="month-view-header"
      >
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-md transition"
            onClick={onClose}
          >
            ✕
          </button>

          <h3 className="text-lg font-bold text-gray-800">{tHere("月曆")}</h3>
          {totalEventsThisMonth > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {tHere("item數量", { count: totalEventsThisMonth })}
            </span>
          )}
          <button
            className="px-2.5 py-1 text-xs bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition shadow-xs"
            onClick={() => setSelectedMonth1stDate(dayjs().startOf("month"))}
          >
            {tHere("本月份")}
          </button>
        </div>

        {/* 中間年月切換 */}
        <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-xs p-0.5">
          <button
            className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 rounded transition text-xs font-bold"
            onClick={() =>
              setSelectedMonth1stDate(
                selectedMonth1stDate.subtract(1, "month").startOf("month"),
              )
            }
          >
            &lt;
          </button>

          <div className="flex items-center px-1 text-xs font-semibold text-gray-700 gap-1">
            <select
              value={selectedMonth1stDate.format("YYYY")}
              className="bg-transparent cursor-pointer hover:text-blue-600 focus:outline-none"
              onChange={(e) =>
                e.target.value &&
                setSelectedMonth1stDate((prev) =>
                  dayjs(`${e.target.value}.${prev.format("MM")}.01`),
                )
              }
            >
              {_.range(2020, 2035).map((year) => (
                <option key={year} value={year}>
                  {tHere("n年", { year })}
                </option>
              ))}
            </select>
            <span>/</span>
            <select
              value={selectedMonth1stDate.format("MM")}
              className="bg-transparent cursor-pointer hover:text-blue-600 focus:outline-none"
              onChange={(e) =>
                e.target.value &&
                setSelectedMonth1stDate((prev) =>
                  dayjs(`${prev.format("YYYY")}.${e.target.value}.01`),
                )
              }
            >
              {_.range(1, 13).map((month) => (
                <option key={month} value={month.toString().padStart(2, "0")}>
                  {tHere("n月", { month })}
                </option>
              ))}
            </select>
          </div>

          <button
            className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 rounded transition text-xs font-bold"
            onClick={() =>
              setSelectedMonth1stDate(
                selectedMonth1stDate.add(1, "month").startOf("month"),
              )
            }
          >
            &gt;
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            data-tour="add-a-new-schedule-button"
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition shadow-xs flex items-center gap-1"
            onClick={() => {
              onAddNewItem(
                undefined,
                selectedMonth1stDate.format("YYYY-MM-DD"),
                selectedMonth1stDate.valueOf(),
              );
              if (isRunning && activeStep?.id === "add-a-new-schedule")
                nextStep();
            }}
          >
            <span>+</span> {tHere("新增")}
          </button>
        </div>
      </div>

      {/* 主體區：支援縱向自動滾動，解決高度不夠問題 */}
      <div
        className="flex-1 flex flex-col min-h-0 overflow-y-auto"
        data-tour="month-view-table"
      >
        {/* 固定星期表頭 */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-500 py-1.5 shrink-0 sticky top-0 z-10">
          <div className="text-red-500">{tHere("日")}</div>
          <div>{tHere("一")}</div>
          <div>{tHere("二")}</div>
          <div>{tHere("三")}</div>
          <div>{tHere("四")}</div>
          <div>{tHere("五")}</div>
          <div className="text-blue-500">{tHere("六")}</div>
        </div>

        {/* 日期網格：設定最小高度 min-h-[500px]，確保橫屏時不會被壓扁 */}
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-1px min-h-120 grow">
          {/* 上個月補白 */}
          {prevMonthDays.map((d) => (
            <div
              key={d.format("YYYY-MM-DD")}
              className="bg-gray-50/50 p-1 flex flex-col opacity-30 select-none min-h-16.5"
            >
              <span className="text-[11px] text-gray-400 font-medium">
                {d.date()}
              </span>
            </div>
          ))}

          {/* 本月日期 */}
          {currentMonthDays.map((d) => {
            const dayNum = d.date();
            const dayEvents = groupOfThisMonth[dayNum] || [];
            const isToday = d.isSame(today, "day");

            return (
              <MonthDayCell
                key={d.format("YYYY-MM-DD")}
                date={d}
                isToday={isToday}
                dayEvents={dayEvents}
                openDayView={openDayView}
              />
            );
          })}

          {/* 下個月補白 */}
          {nextMonthDays.map((d) => (
            <div
              key={d.format("YYYY-MM-DD")}
              className="bg-gray-50/50 p-1 flex flex-col opacity-30 select-none min-h-16.5"
            >
              <span className="text-[11px] text-gray-400 font-medium">
                {d.date()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
