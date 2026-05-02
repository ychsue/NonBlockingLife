import Utils from '../../../gas/src/Utils'

export const CRON_PREVIEW_LIMIT = 10

export function getCronParts(cronExpr?: string): [string, string, string, string, string] {
  const parts = (cronExpr ?? '').split(' ')
  return [
    parts[0] ?? '',
    parts[1] ?? '',
    parts[2] ?? '',
    parts[3] ?? '',
    parts[4] ?? '',
  ]
}

export function buildCronExpr(parts: string[]): string {
//   return parts.slice(0, 5).map((part) => (part.trim() ? part.trim() : '*')).join(' ')
  return parts.slice(0, 5).map((part) => (part.trim() ? part.trim() : '')).join(' ').trim()
}

export function getUpcomingOccurrences(cronExpr: string, limit = CRON_PREVIEW_LIMIT): number[] {
  const runs: number[] = []
  let cursor = new Date()

  for (let index = 0; index < limit; index += 1) {
    const nextRun = Utils.getNextOccurrence(cronExpr, cursor)
    if (!nextRun) break

    const timestamp = nextRun.getTime()
    runs.push(timestamp)
    cursor = new Date(timestamp + 1000)
  }

  return runs
}