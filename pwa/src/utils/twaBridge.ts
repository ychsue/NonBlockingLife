export interface TwaBridgeMessage {
  type: string
  payload?: Record<string, unknown>
  sentAt?: number
  source?: 'pwa'
}

export interface TwaBridgeState {
  port: MessagePort | null
  connected: boolean
  lastMessage: TwaBridgeMessage | null
}

const TWA_BRIDGE_STATE: TwaBridgeState = {
  port: null,
  connected: false,
  lastMessage: null,
}

function isMessageEvent(value: unknown): value is MessageEvent {
  return typeof value === 'object' && value !== null && 'data' in value
}

export function listenForTwaMessages(
  onMessage: (event: MessageEvent, port: MessagePort | null) => void
): () => void {
  const handler = (event: MessageEvent) => {
    const port = Array.isArray(event.ports) && event.ports.length > 0 ? event.ports[0] : null
    if (port) {
      TWA_BRIDGE_STATE.port = port
      TWA_BRIDGE_STATE.connected = true
    }

    TWA_BRIDGE_STATE.lastMessage = {
      type: typeof event.data === 'string' ? event.data : 'message',
      payload: typeof event.data === 'object' && event.data !== null ? event.data as Record<string, unknown> : undefined,
      sentAt: Date.now(),
      source: 'pwa',
    }

    onMessage(event, port)
  }

  window.addEventListener('message', handler)

  return () => {
    window.removeEventListener('message', handler)
  }
}

export function getTwaBridgeState(): TwaBridgeState {
  return { ...TWA_BRIDGE_STATE }
}

export function sendTwaMessage(message: TwaBridgeMessage): boolean {
  const port = TWA_BRIDGE_STATE.port

  if (port) {
    port.postMessage(message)
    return true
  }

  return false
}

export function sendTwaBridgeTestMessage(label: string): boolean {
  return sendTwaMessage({
    type: 'nbl:test-message',
    payload: {
      label,
      from: 'pwa',
      time: Date.now(),
    },
    sentAt: Date.now(),
    source: 'pwa',
  })
}

export function buildTwaBridgePayload(
  type: string,
  payload: Record<string, unknown>
): TwaBridgeMessage {
  return {
    type,
    payload,
    sentAt: Date.now(),
    source: 'pwa',
  }
}

export function maybeFallbackToScheme(
  scheme: string,
  params: Record<string, string | number | boolean>
): boolean {
  try {
    const url = new URL(`${scheme}`)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
    window.location.href = url.toString()
    return true
  } catch {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      query.set(key, String(value))
    })
    const fallback = `${scheme}?${query.toString()}`
    window.location.href = fallback
    return true
  }
}

export function getTwaMessagePort(): MessagePort | null {
  return TWA_BRIDGE_STATE.port
}
