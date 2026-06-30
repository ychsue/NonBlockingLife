import { useDialogStore } from "../../store/dialogStore";
import { interpolateTemplate, sanitizeHttpUrl } from "../interpolate";
import type { ParsedMacroCommand } from "../parser";

export interface OpenUrlDeps {
  confirmOpenUrl: (url: string, title?: string) => Promise<boolean>;
  openUrl: (url: string) => Promise<void>;
}

export async function executeOpenUrl(
  command: ParsedMacroCommand,
  context: Record<string, unknown>,
): Promise<void> {
  const rawUrl = String(command.raw.url)
  const interpolated = interpolateTemplate(rawUrl, context)
  const safeUrl = sanitizeHttpUrl(interpolated)
  const title =
    typeof command.raw.iTitle === 'string'
      ? interpolateTemplate(command.raw.iTitle, context)
      : undefined

  // 等待彈窗結果
  const { actionId } = await useDialogStore.getState().openDialog({
    title: title ?? "前往外部網站",
    message: `您即將前往以下網址，是否確認？\n${safeUrl}`,
    actions: [
      { id: "cancel", label: "取消", className: "bg-gray-500 hover:bg-gray-600 text-white rounded-md px-4 py-2" },
      {
        id: "ok",
        label: "確認前往",
        className: "bg-blue-500 hover:bg-blue-600 text-white rounded-md px-4 py-2",
        openUrlBeforeResolve: safeUrl,
      },
    ],
  });

  if (actionId === "cancel") {
    throw new Error("User cancelled openUrl");
  }
}
