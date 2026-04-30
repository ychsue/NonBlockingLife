import { useAppStore } from '../store/appStore'
import { en } from './en'
import { zhTW } from './zh-TW'
import { ja } from './ja'

export type SupportedLocale = 'en' | 'zh-TW' | 'ja'
export type TranslationKey = keyof typeof en

const translations: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en:     en as Record<TranslationKey, string>,
  'zh-TW': zhTW,
  ja,
}

export function getInitialLocale(): SupportedLocale {
  const stored = localStorage.getItem('nbl_locale')
  if (stored === 'en' || stored === 'zh-TW' || stored === 'ja') return stored
  // Auto-detect: prefer zh-TW for zh browsers
  if (navigator.language.toLowerCase().startsWith('zh')) return 'zh-TW'
  if (navigator.language.toLowerCase().startsWith('ja')) return 'ja'
  return 'en'
}

/**
 * Returns a `t(key, vars?)` translation function bound to the current locale.
 *
 * Usage:
 *   const t = useT()
 *   t('dialog.cancel')               // → "Cancel" or "取消"
 *   t('candidates.count', { n: 5 })  // → "5 candidates" or "共 5 個候選任務"
 *
 * Adding a new language:
 *   1. Create `src/i18n/<locale>.ts` that satisfies `Record<TranslationKey, string>`
 *   2. Add it to the `translations` map above
 *   3. Add the locale to `SupportedLocale`
 */
export function useT() {
  const locale = useAppStore((s) => s.locale)
  const map = translations[locale] ?? translations['zh-TW']

  return function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let str: string = map[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return str
  }
}

/**
 * Non-hook translation function for use outside React components.
 * Reads the current locale directly from the Zustand store state.
 */
export function getT() {
  const locale = useAppStore.getState().locale
  const map = translations[locale] ?? translations['zh-TW']

  return function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let str: string = map[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return str
  }
}
