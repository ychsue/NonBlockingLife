import type { NativeBridge } from "./NativeBridge";

export type IcsFetchSource = "native" | "direct" | "supabase";

export interface IcsFetchResult {
  icsContent: string;
  source: IcsFetchSource;
}

export interface IcsFetchOptions {
  nativeBridge?: Pick<NativeBridge, "has" | "fetchIcs">;
  /** 提供時才會嘗試 Supabase fetch-ics Edge Function */
  supabaseFetchIcs?: (url: string) => Promise<string>;
  /** 可注入以便測試，預設為全域 fetch */
  directFetch?: (url: string) => Promise<string>;
}

const defaultDirectFetch = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

function assertIcs(content: unknown): string {
  if (
    typeof content !== "string" ||
    !content.trimStart().startsWith("BEGIN:VCALENDAR")
  ) {
    throw new Error("Response is not an ICS document");
  }
  return content;
}

/**
 * 依序嘗試：native shell → 直連 → Supabase Edge Function。
 * 全部失敗時 reject（呼叫端應提示使用者改用手動匯入）。
 */
export async function fetchIcsWithFallback(
  url: string,
  opts: IcsFetchOptions = {},
): Promise<IcsFetchResult> {
  const { nativeBridge, supabaseFetchIcs, directFetch = defaultDirectFetch } =
    opts;
  const attempts: Array<[IcsFetchSource, () => Promise<string>]> = [];

  if (nativeBridge?.has("fetchIcs")) {
    attempts.push(["native", () => nativeBridge.fetchIcs(url)]);
  }
  attempts.push(["direct", () => directFetch(url)]);
  if (supabaseFetchIcs) {
    attempts.push(["supabase", () => supabaseFetchIcs(url)]);
  }

  const errors: string[] = [];
  for (const [source, run] of attempts) {
    try {
      return { icsContent: assertIcs(await run()), source };
    } catch (e) {
      errors.push(`${source}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`All ICS fetch strategies failed (${errors.join("; ")})`);
}
