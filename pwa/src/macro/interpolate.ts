const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export function interpolateTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(TOKEN_RE, (_full, key: string) => {
    const value = context[key]
    if (value === undefined || value === null) {
      throw new Error(`Missing template variable: ${key}`)
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(`Template variable must be string/number: ${key}`)
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
