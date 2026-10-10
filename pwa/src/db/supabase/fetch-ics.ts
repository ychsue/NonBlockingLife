// 參考 Discussion\cross_platform\discussion_20261008.md
// 其中也有 Gemini 的回答

const ORIGIN = Deno.env.get("NBL_ALLOWED_ORIGIN") ?? "*";
const TOKEN = Deno.env.get("NBL_PROXY_TOKEN"); // 可選
const MAX_BYTES = 2 * 1024 * 1024; // 限制最大 2MB
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-nbl-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const bad = (m: string, s = 400) =>
  new Response(m, { status: s, headers: cors });

function isPrivateIP(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("172.16.") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  );
}

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight 處理
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (TOKEN && req.headers.get("x-nbl-token") !== TOKEN)
    return bad("forbidden", 403);

  try {
    // 2. 解析 Target URL
    const { icsUrl } = await req.json();
    if (!icsUrl) {
      return bad("Missing icsUrl parameter");
    }

    const parsedUrl = new URL(icsUrl);

    // 3. 安全過濾：限 HTTPS & 拒絕內網 IP
    if (parsedUrl.protocol !== "https:") {
      return bad("Only HTTPS URLs are allowed", 400);
    }

    if (isPrivateIP(parsedUrl.hostname)) {
      return bad("Forbidden target address", 400);
    }

    // 4. 發送帶 Timeout 的 Fetch 請求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 秒逾時

    const targetResponse = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "NonBlockingLife-CalendarProxy/1.0",
      },
    });
    clearTimeout(timeoutId);

    if (!targetResponse.ok) {
      return bad(`Remote server returned ${targetResponse.status}`, 502);
    }

    // 5. 檔案大小檢查
    const contentLength = targetResponse.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
      return bad("File size exceeds limit (max 2MB)", 413);
    }

    const arrayBuffer = await targetResponse.arrayBuffer();
    // 5.1. 先做位元組大小檢查 (不受 UTF-8 字數影響，單純計算 Byte 體積)
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return bad("File size exceeds limit (max 2MB)", 413);
    }

    // 5.2. 從 Header 判斷字集並轉碼 (預設 utf-8，符合 RFC 5545)
    const contentType = targetResponse.headers.get("content-type") || "";
    const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
    const encoding = charsetMatch ? charsetMatch[1] : "utf-8";

    let textContent = "";
    try {
      textContent = new TextDecoder(encoding).decode(arrayBuffer);
    } catch {
      textContent = new TextDecoder("utf-8").decode(arrayBuffer);
    }

    // 6. 核心驗證：確保為合法 iCalendar
    if (!textContent.includes("BEGIN:VCALENDAR")) {
      return bad("Invalid content: Target is not a valid iCalendar file", 422);
    }

    // 7. 回傳給 PWA (統一宣告 UTF-8 避免瀏覽器二次亂碼)
    return new Response(textContent, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err: any) {
    const errorMessage =
      err.name === "AbortError" ? "Fetch timeout" : err.message;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
});
