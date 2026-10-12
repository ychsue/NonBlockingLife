import { describe, expect, test, vi } from "vitest";
import { fetchIcsWithFallback } from "../fetchIcs";

const ICS = "BEGIN:VCALENDAR\nEND:VCALENDAR";
const native = (fn: () => Promise<string>, has = true) => ({
  has: () => has,
  fetchIcs: fn,
});

describe("fetchIcsWithFallback", () => {
  test("prefers native", async () => {
    vi.stubEnv("DEV", false);
    const direct = vi.fn();
    const r = await fetchIcsWithFallback("u", {
      nativeBridge: native(async () => ICS),
      directFetch: direct,
    });
    expect(r.source).toBe("native");
    expect(direct).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  test("falls through native -> direct -> supabase", async () => {
    const r = await fetchIcsWithFallback("u", {
      nativeBridge: native(() => Promise.reject(new Error("x"))),
      directFetch: () => Promise.reject(new Error("cors")),
      supabaseFetchIcs: async () => ICS,
    });
    expect(r.source).toBe("supabase");
  });

  test("skips native when capability missing", async () => {
    const fetchIcs = vi.fn();
    const r = await fetchIcsWithFallback("u", {
      nativeBridge: { has: () => false, fetchIcs },
      directFetch: async () => ICS,
    });
    expect(r.source).toBe("direct");
    expect(fetchIcs).not.toHaveBeenCalled();
  });

  test("rejects non-ICS content and reports all failures", async () => {
    await expect(
      fetchIcsWithFallback("u", {
        directFetch: async () => "<html>",
        supabaseFetchIcs: async () => ({}) as any,
      }),
    ).rejects.toThrow(/direct.*supabase/);
  });
});
