const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g
const BLOCKED_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor'])

function validatePath(path: string) {
  if (!path || !path.trim()) {
    throw new Error('Path cannot be empty')
  }

  const segments = path.split('.')
  for (const segment of segments) {
    if (!segment.trim()) {
      throw new Error(`Invalid path segment in '${path}'`)
    }

    if (BLOCKED_PATH_SEGMENTS.has(segment)) {
      throw new Error(`Blocked path segment: ${segment}`)
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function getContextPath(context: Record<string, unknown>, path: string): unknown {
  validatePath(path)

  const segments = path.split('.')
  let current: unknown = context

  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      throw new Error(`Missing template variable: ${path}`)
    }
    current = current[segment]
  }

  return current
}

export function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value

  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export function setContextPath(context: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  validatePath(path)
  const segments = path.split('.')
  const root = cloneValue(context)

  let cursor: Record<string, unknown> = root
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i]
    const next = cursor[segment]
    if (!isRecord(next)) {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as Record<string, unknown>
  }

  cursor[segments[segments.length - 1]] = value
  return root
}

export function interpolateTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(TOKEN_RE, (_full, key: string) => {
    const value = getContextPath(context, key)
    if (value === undefined || value === null) {
      throw new Error(`Missing template variable: ${key}`)
    }

    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      throw new Error(`Template variable must be string/number/boolean: ${key}`)
    }

    return String(value)
  })
}

export function sanitizeHttpUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`)
  }

  return parsed.toString()
}
