import { describe, expect, it } from 'vitest'
import { getPredictedNextRun } from '../cronUtils'

describe('getPredictedNextRun', () => {
  it('returns a timestamp for a valid cron expression', () => {
    const base = new Date('2026-01-01T09:00:00')
    const predicted = getPredictedNextRun('0 9 * * *', base)

    expect(predicted).toBeDefined()
    expect(predicted).toBeGreaterThan(base.getTime())
  })

  it('returns undefined for an invalid cron expression', () => {
    expect(getPredictedNextRun('not-a-cron', new Date())).toBeUndefined()
  })
})
