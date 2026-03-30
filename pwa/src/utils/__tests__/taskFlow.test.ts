import { describe, it, expect } from 'vitest'
import { __taskFlowTestables } from '../taskFlow'

describe('taskFlow focusTime rules', () => {
  const { resolveStartTimerMinutes, parseRecordMetadata, resolveRecordDuration } = __taskFlowTestables

  it('falls back to 30 when focusTime is missing', () => {
    expect(resolveStartTimerMinutes(undefined)).toBe(30)
  })

  it('uses explicit focusTime when value is positive', () => {
    expect(resolveStartTimerMinutes(15)).toBe(15)
    expect(resolveStartTimerMinutes(25.9)).toBe(25)
  })

  it('returns 0 to disable timer when focusTime is zero or negative', () => {
    expect(resolveStartTimerMinutes(0)).toBe(0)
    expect(resolveStartTimerMinutes(-3)).toBe(0)
  })

  it('parses duration and note from json payload', () => {
    const metadata = parseRecordMetadata('{"duration": 25, "note": "會後補記"}')
    expect(metadata.duration).toBe(25)
    expect(metadata.normalizedNote).toBe('會後補記')
  })

  it('parses duration from inline note pattern', () => {
    const metadata = parseRecordMetadata('追記一下 duration=15')
    expect(metadata.duration).toBe(15)
    expect(metadata.normalizedNote).toBe('追記一下')
  })

  it('prefers explicit duration input over parsed note duration', () => {
    const resolved = resolveRecordDuration(12, 30)
    expect(resolved.duration).toBe(12)
    expect(resolved.error).toBeUndefined()
  })

  it('rejects duration that exceeds upper limit', () => {
    const resolved = resolveRecordDuration(721, undefined)
    expect(resolved.duration).toBeUndefined()
    expect(resolved.error).toContain('上限')
  })
})
