import type { IcsEventItem } from '../db/schema'

/**
 * 動態載入 ical.js 解析 ics 文字（不會增加初始 Bundle 體積）
 */
export async function parseIcsContent(
  icsContent: string, 
  sourceId: string
): Promise<IcsEventItem[]> {
  // 💡 動態 Import ical.js (Lazy Loading)
  const ICAL = (await import('ical.js')).default

  try {
    const jcalData = ICAL.parse(icsContent)
    const comp = new ICAL.Component(jcalData)
    const vevents = comp.getAllSubcomponents('vevent')

    const events: IcsEventItem[] = []
    const now = Date.now()

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent)

      // 提取基本資訊
      const uid = event.uid || `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const title = event.summary || '(無標題)'
      const description = event.description || ''
      const location = event.location || ''
      
      // 時間處理 (ical.js 會自動處理時區與全天事件)
      const startDate = event.startDate
      const endDate = event.endDate

      const startAt = startDate ? startDate.toJSDate().getTime() : 0
      if (!startAt) continue // 無效時間跳過

      const endAt = endDate ? endDate.toJSDate().getTime() : undefined
      const isAllDay = startDate ? startDate.isDate : false

      // 取得原始 RRULE 字串 (若有)
      const rruleProp = vevent.getFirstProperty('rrule')
      const rrule = rruleProp ? rruleProp.getFirstValue()?.toString() : undefined

      const eventId = `ICS_${sourceId}_${uid.replace(/[^a-zA-Z0-9_-]/g, '_')}`

      events.push({
        eventId,
        sourceId,
        uid,
        title,
        status: 'WAITING',
        startAt,
        endAt,
        isAllDay,
        location,
        description,
        rrule,
        rawIcs: vevent.toString(),
        updatedAt: now,
      })
    }

    return events
  } catch (err) {
    console.error('Failed to parse ics content with ical.js:', err)
    return []
  }
}