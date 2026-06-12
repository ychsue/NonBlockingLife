import { afterEach, describe, expect, test, vi } from 'vitest'
import { shouldOpenRowEdit } from '../rowEditUtils'

class MockElement {
  readonly tagName: string
  private readonly closestMatches: boolean

  constructor(tagName: string, closestMatches: boolean) {
    this.tagName = tagName
    this.closestMatches = closestMatches
  }

  closest() {
    return this.closestMatches ? this : null
  }
}

describe('shouldOpenRowEdit', () => {
  const originalElement = globalThis.Element

  afterEach(() => {
    if (originalElement === undefined) {
      // @ts-expect-error
      delete (globalThis as typeof globalThis & { Element?: typeof Element }).Element
    } else {
      globalThis.Element = originalElement
    }
    vi.restoreAllMocks()
  })

  test('會阻擋 input 內的點擊，不開啟列編輯', () => {
    globalThis.Element = MockElement as unknown as typeof Element

    const target = new MockElement('INPUT', true) as unknown as EventTarget

    expect(shouldOpenRowEdit(target)).toBe(false)
  })

  test('非互動元素點擊時允許開啟列編輯', () => {
    globalThis.Element = MockElement as unknown as typeof Element

    const target = new MockElement('DIV', false) as unknown as EventTarget

    expect(shouldOpenRowEdit(target)).toBe(true)
  })
})