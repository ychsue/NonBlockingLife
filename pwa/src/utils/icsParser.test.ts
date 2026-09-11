import { describe, it, expect } from "vitest";
import { parseIcsContent } from "./icsParser";

describe("icsParser", () => {
  it("應能正確解析標準 iCalendar 事件與全天事件", async () => {
    const sampleIcs = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
BEGIN:VEVENT
DTSTART:20260909T020000Z
DTEND:20260909T030000Z
DTSTAMP:20260909T100000Z
UID:test-uid-123@google.com
SUMMARY:線上產品設計會議
DESCRIPTION:討論 NonBlockingLife 的 ics 設計\\n記得準備簡報。
LOCATION:Google Meet
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260910
DTEND;VALUE=DATE:20260911
UID:all-day-uid-456@google.com
SUMMARY:全天團隊聚餐
END:VEVENT
END:VCALENDAR
    `.trim();

    const events = await parseIcsContent(sampleIcs, "SRC_TEST");

    expect(events).toHaveLength(2);

    // 第一個事件驗證 (一般時間)
    const event1 = events[0];
    expect(event1.title).toBe("線上產品設計會議");
    expect(event1.description).toBe(
      "討論 NonBlockingLife 的 ics 設計\n記得準備簡報。",
    );
    expect(event1.location).toBe("Google Meet");
    expect(event1.isAllDay).toBe(false);
    expect(event1.startAt).toBe(
      new Date(Date.UTC(2026, 8, 9, 2, 0, 0)).getTime(),
    );

    // 第二個事件驗證 (全天事件)
    const event2 = events[1];
    expect(event2.title).toBe("全天團隊聚餐");
    expect(event2.isAllDay).toBe(true);
    expect(event2.startAt).toBe(new Date(2026, 8, 10, 0, 0, 0).getTime());
  });

  it("應能處理折行 (Line Folding)", async () => {
    // 💡 補上 DTSTART 確保 ical.js 判定為有效 event
    const sampleIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:fold-123
DTSTART:20260909T090000Z
SUMMARY:這是一段很長很長的
 標題跨行顯示測試
END:VEVENT
END:VCALENDAR`.trim();

    const events = await parseIcsContent(sampleIcs, "SRC_TEST");
    expect(events[0].title).toBe("這是一段很長很長的標題跨行顯示測試");
  });
});
