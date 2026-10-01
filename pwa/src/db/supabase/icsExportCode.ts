// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

export default {
  async fetch(req: Request) {
    // 建立 Supabase Client (直接讀取系統預設環境變數)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      const generatedAt = new Date();

      // 1. 讀取所需的三張表 (ics_export_configs, projects, scheduled)
      const { data: configs } = await supabase.from("ics_export_configs").select("*").eq("deleted", false);
      const { data: projectsRaw } = await supabase.from("projects").select("*").eq("deleted", false);
      const { data: scheduledRaw } = await supabase.from("scheduled").select("*").eq("deleted", false);

      const projects = (projectsRaw || []).map((r: any) => ({ ...r.data, id: r.id }));
      const scheduled = (scheduledRaw || []).map((r: any) => ({ ...r.data, taskId: r.task_id }));

      const results = [];

      for (const configRow of (configs || [])) {
        const config = configRow.data;
        if (config.enabled !== true) continue;

        // 展開子專案 ID
        const projectIds = expandProjectIds(config.projectIds || [], projects, config.includeSubProjects === true);

        // 計算時間區間
        const daysBefore = Number(config.timeRangeDaysBefore ?? 30);
        const daysAfter = Number(config.timeRangeDaysAfter ?? 90);
        const startRange = generatedAt.getTime() - daysBefore * 86400000;
        const endRange = generatedAt.getTime() + daysAfter * 86400000;

        // 篩選事件
        const filtered = scheduled.filter((item: any) => {
          if (!Array.isArray(item.projectIds) || !item.projectIds.some((id: string) => projectIds.has(id))) return false;
          const nextRun = Number(item.nextRun);
          return Number.isFinite(nextRun) && nextRun >= startRange && nextRun <= endRange;
        });

        // 產生 ICS 內文
        const icsContent = buildCalendar(filtered, config, generatedAt);
        const fileName = config.fileName ? (config.fileName.endsWith(".ics") ? config.fileName : `${config.fileName}.ics`) : `${configRow.id}.ics`;

        // 2. 上傳至 Supabase Storage (使用 ics-exports Bucket)
        const { error: uploadError } = await supabase.storage
          .from("ics-exports")
          .upload(fileName, icsContent, {
            contentType: "text/calendar; charset=utf-8",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // 取得 Public URL
        const { data: urlData } = supabase.storage.from("ics-exports").getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        // 3. 回寫 ics_export_configs 資料表
        config.url = publicUrl;
        config.lastGeneratedAt = generatedAt.getTime();
        config.updatedAt = generatedAt.getTime();

        await supabase.from("ics_export_configs").update({
          data: config,
          updated_at: generatedAt.getTime(),
          synced_at: generatedAt.getTime(),
        }).eq("id", configRow.id);

        results.push({ id: configRow.id, success: true, count: filtered.length, url: publicUrl });
      }

      return Response.json({ success: true, results });
    } catch (err: any) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  },
};

// 輔助函式：展開子專案 ID
function expandProjectIds(initialIds: string[], projects: any[], includeSub: boolean) {
  const selected = new Set(initialIds);
  if (!includeSub || selected.size === 0) return selected;

  const childrenMap = new Map<string, string[]>();
  projects.forEach((p) => {
    if (p.parentId) {
      if (!childrenMap.has(p.parentId)) childrenMap.set(p.parentId, []);
      childrenMap.get(p.parentId)!.push(p.id);
    }
  });

  const stack = Array.from(selected);
  while (stack.length) {
    const parentId = stack.pop()!;
    const children = childrenMap.get(parentId) || [];
    children.forEach((childId) => {
      if (!selected.has(childId)) {
        selected.add(childId);
        stack.push(childId);
      }
    });
  }
  return selected;
}

// 輔助函式：建構 ICS 文字
function buildCalendar(items: any[], config: any, generatedAt: Date) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YesCirculation-Solutions//NONBLOCKINGLIFE//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(config.name || config.fileName || "NonBlockingLife")}`,
  ];

  const stamp = formatDate(generatedAt);

  items.forEach((item) => {
    const start = Number(item.nextRun);
    if (!Number.isFinite(start)) return;
    const end = start + 60000 * Number(item.focusTime || 30);
    const uid = `${encodeURIComponent(String(config.id))}-${encodeURIComponent(String(item.taskId))}@yescirculation-solutions.com`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${formatDate(new Date(start))}`);
    lines.push(`DTEND:${formatDate(new Date(end))}`);
    lines.push(`SUMMARY:${escapeText(item.title || "")}`);
    if (item.note && config.exportPrivateNotes === true) {
      lines.push(`DESCRIPTION:${escapeText(item.note)}`);
    }
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function formatDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeText(val: string) {
  return String(val || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}