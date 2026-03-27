import { __taskFlowTestables } from '../taskFlow'

describe('taskFlow focusTime rules', () => {
  const { resolveStartTimerMinutes } = __taskFlowTestables

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
})
