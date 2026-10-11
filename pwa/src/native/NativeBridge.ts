export type NativeCapability =
  | "alarm"
  | "notify"
  | "fetchIcs"
  | "share"
  | "openExternal";

export type NativeShellKind = "web" | "twa" | "desktop";

export interface SendOptions {
  /** 是否等待回應，預設 true */
  expectResponse?: boolean;
  /** 逾時 (ms)，預設 3000 */
  timeoutMs?: number;
}

/** 與既有 useTwaRpc.sendRequest 相同簽章，讓 Android 行為不變 */
export type RpcSend = (
  type: string,
  payload?: Record<string, any>,
  options?: SendOptions,
) => Promise<any>;

export interface NativeBridge {
  readonly kind: NativeShellKind;
  has(cap: NativeCapability): boolean;
  /** 低階 RPC；web 實作會直接 reject */
  request<T = any>(
    type: string,
    payload?: Record<string, any>,
    options?: SendOptions,
  ): Promise<T>;
  /** 透過 shell 抓取 ICS 文字；不支援時 reject */
  fetchIcs(url: string): Promise<string>;
}

export class NativeUnsupportedError extends Error {
  constructor(what: string) {
    super(`Native feature not supported: ${what}`);
    this.name = "NativeUnsupportedError";
  }
}

/** 純 PWA：沒有任何原生能力 */
export function createWebBridge(): NativeBridge {
  return {
    kind: "web",
    has: () => false,
    request: (type) => Promise.reject(new NativeUnsupportedError(type)),
    fetchIcs: () => Promise.reject(new NativeUnsupportedError("fetchIcs")),
  };
}

const TWA_DEFAULT_CAPS: NativeCapability[] = ["alarm", "notify", "fetchIcs"];

/** 包裝既有 TWA/WebView RPC */
export function createTwaBridge(
  send: RpcSend,
  caps: NativeCapability[] = TWA_DEFAULT_CAPS,
): NativeBridge {
  const set = new Set(caps);
  return {
    kind: "twa",
    has: (cap) => set.has(cap),
    request: (type, payload = {}, options) => send(type, payload, options),
    async fetchIcs(url) {
      if (!set.has("fetchIcs")) throw new NativeUnsupportedError("fetchIcs");
      const res = await send("nbl:fetch-ics", { url });
      if (typeof res?.icsContent !== "string") {
        throw new Error("Invalid nbl:fetch-ics response");
      }
      return res.icsContent;
    },
  };
}
