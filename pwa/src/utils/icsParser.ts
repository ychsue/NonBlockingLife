import ICAL from "ical.js";
import type { IcsEventItem } from "../db/schema";

/**
 * 動態載入 ical.js 解析 ics 文字（不會增加初始 Bundle 體積）
 */
export async function parseIcsContent(
  icsContent: string,
  sourceId: string,
): Promise<IcsEventItem[]> {
  // 💡 動態 Import ical.js (Lazy Loading)
  // const ICAL = (await import('ical.js')).default

  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents("vevent");
    const vTimeZone = comp.getFirstSubcomponent("vtimezone");

    const events: IcsEventItem[] = [];
    const now = Date.now();

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      // 提取基本資訊
      const uid =
        event.uid ||
        `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const title = event.summary || "(無標題)";
      const description = event.description || "";
      const location = event.location || "";

      // 時間處理 (ical.js 會自動處理時區與全天事件)
      const startDate = event.startDate;
      const endDate = event.endDate;
      // 相差時間 (毫秒)
      const duration = startDate && endDate ? endDate.toJSDate().getTime() - startDate.toJSDate().getTime() : 0;

      let startAt = startDate ? startDate.toJSDate().getTime() : 0;
      if (!startAt) continue; // 無效時間跳過

      let endAt = endDate ? endDate.toJSDate().getTime() : undefined;
      const isAllDay = startDate ? startDate.isDate : false;

      // 取得原始 RRULE 字串 (若有)
      const rruleProp = vevent.getFirstProperty("rrule");
      const rrule = rruleProp
        ? rruleProp.getFirstValue()?.toString()
        : undefined;

      // 根據 rrule 判斷事件是否為重複事件，然後看看是否更新 startAt，若 startAt < Date.now()，則標示為 'Done'
      let nextRun = rrule ? getNextRun(vevent, startDate, new Date(now)) : null;
      let status = "WAITING";
      if ((nextRun && nextRun.getTime() < now) || (!nextRun && startAt < now)) {
        // 若下一次發生時間已經過去，標示為 'Done'
        status = "Done";
      } else if (nextRun && nextRun.getTime() >= now) {
        // 若下一次發生時間尚未到，標示為 'WAITING'
        status = "WAITING";
        startAt = nextRun.getTime();
        endAt = startAt + duration;
      }

      // 如果是整天的事件，那就直接將 endAt 設為 startAt + 24 小時
      if (isAllDay) {
        endAt = startAt + 24 * 60 * 60 * 1000; // 24 小時的毫秒數
      }

      // 取得提醒的偏移量 (若有)
      const alarmProps = vevent.getAllSubcomponents("valarm");
      let reminderOffsets: string | number[] | undefined = undefined;

      if (alarmProps.length > 0) {
        let reminderOffsetsSet = new Set<number>();
        alarmProps.forEach((ap) => {
          const trigger = ap.getFirstPropertyValue("trigger");
          if (trigger instanceof ICAL.Duration) {
            const action = ap.getFirstPropertyValue("action");
            if (action === "DISPLAY") {
              reminderOffsetsSet.add((trigger.toSeconds() / 60) * -1); // 轉換為分鐘，而由於我定義正值表示提前時間，所以得乘以 -1
            }
          } else {
            // 非 Duration 類型的 trigger，暫不處理
          }
        });
        reminderOffsets = Array.from(reminderOffsetsSet).join(",");
      } else {
        reminderOffsets = undefined;
      }

      const eventId = `ICS_${sourceId}_${uid.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

      events.push({
        eventId,
        sourceId,
        uid,
        title,
        status,
        startAt,
        endAt,
        isAllDay,
        location,
        description,
        rrule,
        rawIcs: createICalendarFromComponents(
          [new ICAL.Event(vevent)],
          vTimeZone,
        ).toString(),
        reminderOffsets,
        updatedAt: now,
      });
    }

    return events;
  } catch (err) {
    console.error("Failed to parse ics content with ical.js:", err);
    return [];
  }
}

/**
 * 取得事件在指定日期之後的下一個發生時間
 * @param vevent 日曆事件
 * @param after 該事件在指定時間之後
 * @returns 下個時刻
 */
export function getNextRun(
  vevent: ICAL.Component,
  dtstart: ICAL.Time,
  after: Date = new Date(Date.now()),
): Date | null {
  const expand = new ICAL.RecurExpansion({
    component: vevent,
    dtstart: dtstart,
  });

  while (true) {
    const next = expand.next();
    if (!next) return null;
    if (next.toJSDate() > after) return next.toJSDate();
  }
}

export function getPreviewRuns(rruleValue: string, prevNextRun: Date, times=10): Date[] {
  const dates: Date[] = [];
  try {
    const rulePart = rruleValue.startsWith("RRULE:")
      ? rruleValue.substring("RRULE:".length)
      : rruleValue;

    const rrule = ICAL.Recur.fromString(rulePart);
    const dtstart = ICAL.Time.fromJSDate(prevNextRun);
    const comp = new ICAL.Component("vevent");
    comp.addPropertyWithValue("dtstart", dtstart);
    comp.addPropertyWithValue("rrule", rrule);

    const expand = new ICAL.RecurExpansion({ component: comp, dtstart });

    while (true) {
      const next = expand.next();
      if (!next) break;
      dates.push(next.toJSDate());
      if (dates.length >= times) break;
    }
  } catch (err) {
    console.error("Failed to get preview runs:", err);
  }
  return dates;
}

/**
 * 這裡只由 ICAL Component 生成 iCalendar 組件
 * @param events 事件們
 * @param timeZone 可選的時區組件
 * @returns 生成的 iCalendar 組件
 */
export function createICalendarFromComponents(
  events: ICAL.Event[],
  timeZone?: ICAL.Component | null,
): ICAL.Component {
  const cal = new ICAL.Component(["vcalendar", [], []]);
  if (timeZone) {
    cal.addSubcomponent(timeZone);
  }
  events.forEach((event) => {
    cal.addSubcomponent(event.component);
  });
  return cal;
}
