export interface AndroidAlarmScheduleRequest {
  taskId: string
  title?: string
  eventAt: number
  alarmAt: number
  offsetMinutes: number
  dedupeKey: string
  state?: 'pending' | 'triggered' | 'expired' | 'dismissed'
}

export function normalizeAlarmScheduleRequest(
  input: Partial<AndroidAlarmScheduleRequest> & Pick<AndroidAlarmScheduleRequest, 'taskId' | 'eventAt' | 'alarmAt' | 'offsetMinutes' | 'dedupeKey'>
): AndroidAlarmScheduleRequest {
  return {
    taskId: input.taskId,
    title: input.title ?? undefined,
    eventAt: Number(input.eventAt),
    alarmAt: Number(input.alarmAt),
    offsetMinutes: Number(input.offsetMinutes),
    dedupeKey: input.dedupeKey,
    state: input.state ?? 'pending',
  }
}

export function buildAndroidAlarmScheduleUri(request: Partial<AndroidAlarmScheduleRequest> & Pick<AndroidAlarmScheduleRequest, 'taskId' | 'eventAt' | 'alarmAt' | 'offsetMinutes' | 'dedupeKey'>): string {
  const normalized = normalizeAlarmScheduleRequest(request)
  const params = new URLSearchParams({
    taskId: normalized.taskId,
    eventAt: String(normalized.eventAt),
    alarmAt: String(normalized.alarmAt),
    offsetMinutes: String(normalized.offsetMinutes),
    dedupeKey: normalized.dedupeKey,
    title: normalized.title ?? '',
  })

  return `nonblockinglife://schedule-alarm?${params.toString()}`
}

export function scheduleAndroidAlarm(request: AndroidAlarmScheduleRequest): boolean {
  try {
    const uri = buildAndroidAlarmScheduleUri(request)
    window.location.href = uri
    return true
  } catch (error) {
    console.error('Failed to schedule Android alarm:', error)
    return false
  }
}
