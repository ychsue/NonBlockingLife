import { describe, expect, it } from 'vitest'
import { buildTwaTimerUri } from '../shortcutUtils'

describe('buildAndroidTimerUri', () => {
  it('returns the show-clock intent for show_clock mode', () => {
    expect(buildTwaTimerUri('My Timer', 10, 'show_clock')).toBe(
      'nonblockinglife://show-clock',
    )
  })

  it('returns a set-timer deep link for set_timer mode', () => {
    expect(buildTwaTimerUri('My Timer', 10, 'set_timer')).toBe(
      'nonblockinglife://set-timer?duration=600&skipUi=true&title=My%20Timer',
    )
  })

  it('returns no-op uri for none mode', () => {
    expect(buildTwaTimerUri('My Timer', 10, 'none')).toBe('')
  })
})
