import { describe, expect, test, vi } from "vitest";
import {
  createTwaBridge,
  createWebBridge,
  NativeUnsupportedError,
} from "../NativeBridge";

describe("NativeBridge", () => {
  test("web bridge has no capabilities and rejects", async () => {
    const b = createWebBridge();
    expect(b.has("alarm")).toBe(false);
    await expect(b.fetchIcs("https://x")).rejects.toBeInstanceOf(
      NativeUnsupportedError,
    );
  });

  test("twa bridge forwards request unchanged", async () => {
    const send = vi.fn().mockResolvedValue({ ok: 1 });
    const b = createTwaBridge(send);
    await b.request("nbl:ping", {}, { timeoutMs: 2000 });
    expect(send).toHaveBeenCalledWith("nbl:ping", {}, { timeoutMs: 2000 });
  });

  test("twa fetchIcs uses nbl:fetch-ics and returns icsContent", async () => {
    const send = vi.fn().mockResolvedValue({ icsContent: "BEGIN:VCALENDAR" });
    const b = createTwaBridge(send);
    await expect(b.fetchIcs("https://a/b.ics")).resolves.toBe("BEGIN:VCALENDAR");
    expect(send).toHaveBeenCalledWith("nbl:fetch-ics", { url: "https://a/b.ics" });
  });

  test("twa fetchIcs rejects on bad response or missing capability", async () => {
    await expect(
      createTwaBridge(vi.fn().mockResolvedValue({})).fetchIcs("u"),
    ).rejects.toThrow();
    await expect(createTwaBridge(vi.fn(), ["alarm"]).fetchIcs("u")).rejects.toBeInstanceOf(
      NativeUnsupportedError,
    );
  });
});
