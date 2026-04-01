import { useMemo } from 'react'

export interface SearchConfig {
  query: string
  isOrMode: boolean
}

/**
 * 搜尋過濾 hook - 支援 OR/AND 模式
 * 
 * OR 模式: query 按空白分割，項目只需匹配任意一個詞
 * AND 模式: 項目需匹配所有詞
 * 
 * @param items 要過濾的項目陣列
 * @param config 搜尋配置 { query, isOrMode }
 * @param searchFields 要搜尋的欄位名稱 (例: ['title', 'note', 'url'])
 * @returns 過濾後的項目
 */
export function useSearchFilter<T extends Record<string, any>>(
  items: T[],
  config: SearchConfig,
  searchFields: (keyof T)[]
): T[] {
  const query = config.query.trim().toLowerCase()
  const isOrMode = config.isOrMode
  const fieldSignature = searchFields.map((field) => String(field)).join('|')

  return useMemo(() => {
    // 如果查詢為空，返回所有項目
    if (!query) {
      return items
    }

    // 按空白分割查詢詞
    const keywords = query.split(/\s+/).filter((k) => k.length > 0)

    // 如果沒有有效的關鍵詞，返回所有項目
    if (keywords.length === 0) {
      return items
    }

    return items.filter(item => {
      // 將所有搜尋欄位的值轉換為小寫字符串並合併
      const searchText = searchFields
        .map((field) => {
          const value = item[field]
          if (value === null || value === undefined) return ''
          return String(value).toLowerCase()
        })
        .join(' ')

      if (isOrMode) {
        // OR 模式: 項目只需匹配任意一個關鍵詞
        return keywords.some((keyword) => searchText.includes(keyword))
      } else {
        // AND 模式: 項目需匹配所有關鍵詞
        return keywords.every((keyword) => searchText.includes(keyword))
      }
    })
  }, [items, query, isOrMode, fieldSignature])
}

/**
 * 過濾掉 "DONE" 狀態的項目
 */
export function useHideDone<T extends { status?: string }>(
  items: T[],
  hideDone: boolean
): T[] {
  return useMemo(() => {
    if (!hideDone) return items
    return items.filter(item => item.status !== 'DONE')
  }, [items, hideDone])
}

/**
 * 組合搜尋和隱藏 Done 過濾
 */
export function useTableFilter<T extends Record<string, any> & { status?: string }>(
  items: T[],
  config: SearchConfig,
  searchFields: (keyof T)[],
  hideDone: boolean
): T[] {
  const searchFiltered = useSearchFilter(items, config, searchFields)
  const finalFiltered = useHideDone(searchFiltered, hideDone)
  return finalFiltered
}
