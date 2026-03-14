/**
 * iOS Shortcut 相关工具函数
 */

/**
 * 取得 device 資訊，看是 Apple系列 還是 Android 還是 Windows 還是 Linux
 * @return {string} 'Shortcuts' | 'Android' | 'Windows' | 'Linux' | 'Unknown'
 */
export function getDeviceType():
  | "Shortcuts"
  | "Android"
  | "Windows"
  | "Linux"
  | "Unknown" {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod|mac/.test(userAgent)) return "Shortcuts";
  if (/android/.test(userAgent)) return "Android";
  if (/win/.test(userAgent)) return "Windows";
  if (/linux/.test(userAgent)) return "Linux";
  return "Unknown";
}

/**
 * 获取 shortcut 配置
 */
export interface ShortcutConfig {
  started: boolean;
  taskTitle?: string;
  timerMinutes: number;
  shortcutName: string; // shortcut 的名称（在 iOS 中创建）
}

const NBL_TIMER_INSTALL_URL_KEY = "nbl_timer_install_url";

const DEFAULT_START_SHORTCUT_CONFIG: ShortcutConfig = {
  started: true,
  timerMinutes: 30,
  shortcutName: "NBL_Timer",
};

const DEFAULT_END_SHORTCUT_CONFIG: ShortcutConfig = {
  started: false,
  timerMinutes: 10,
  shortcutName: "NBL_Timer",
};

export function getShortcutConfig(sType: "start" | "end"): ShortcutConfig {
  try {
    const stored = localStorage.getItem("nbl_shortcut_config");
    if (sType === "start") {
      return stored
        ? { ...DEFAULT_START_SHORTCUT_CONFIG, ...JSON.parse(stored) }
        : DEFAULT_START_SHORTCUT_CONFIG;
    } else {
      return stored
        ? { ...DEFAULT_END_SHORTCUT_CONFIG, ...JSON.parse(stored) }
        : DEFAULT_END_SHORTCUT_CONFIG;
    }
  } catch {
    return sType === "start"
      ? DEFAULT_START_SHORTCUT_CONFIG
      : DEFAULT_END_SHORTCUT_CONFIG;
  }
}

export function setShortcutConfig(
  config: Partial<ShortcutConfig>,
  sType: "start" | "end",
): void {
  const current = getShortcutConfig(sType);
  const updated = { ...current, ...config };
  localStorage.setItem("nbl_shortcut_config", JSON.stringify(updated));
}

export function getNblTimerInstallUrl(): string {
  const stored = localStorage.getItem(NBL_TIMER_INSTALL_URL_KEY);
  return stored ? stored.trim() : "";
}

export function setNblTimerInstallUrl(url: string): void {
  const normalized = url.trim();
  if (!normalized) {
    localStorage.removeItem(NBL_TIMER_INSTALL_URL_KEY);
    return;
  }
  localStorage.setItem(NBL_TIMER_INSTALL_URL_KEY, normalized);
}

export function isValidICloudShortcutUrl(url: string): boolean {
  const normalized = url.trim();
  return /^https:\/\/www\.icloud\.com\/shortcuts\/[A-Za-z0-9]+$/i.test(
    normalized,
  );
}

/**
 * 触发 iOS Shortcut 来启动计时器
 * @param taskTitle 任务标题
 * @param taskId 任务ID
 * @param config Shortcut 配置
 * @returns 是否成功触发
 */
export function triggerShortcutTimer(
  taskTitle: string,
  taskId: string,
  config: ShortcutConfig,
): boolean {
  config = { ...config, taskTitle };
  const deviceType = getDeviceType();

  if (["Shortcuts"].includes(deviceType)) {
    try {
      // 构建 Shortcut URL
      // 格式: shortcuts://run-shortcut?name=<shortcut_name>&input=<input_value>
      const shortcutUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(config.shortcutName)}&input=${encodeURIComponent(JSON.stringify(config))}`;

      // 打开 shortcut
      window.location.href = shortcutUrl;

      console.log(
        `✅ Triggered shortcut: ${config.shortcutName} with task: ${taskTitle} (${config.timerMinutes} mins)`,
      );
      return true;
    } catch (error) {
      console.error("Failed to trigger shortcut:", error);
      return false;
    }
  } else if (["Windows"].includes(deviceType)) {
    // 用ms-clock 協定來觸發 Windows 時鐘 app 的計時器功能
    try {
      const shortcutUrl = `ms-clock:timer?duration=${config.timerMinutes * 60}&title=${encodeURIComponent(taskTitle)}`;
      window.location.href = shortcutUrl;
      console.log(
        `✅ Triggered Windows timer with task: ${taskTitle} (${config.timerMinutes} mins)`,
      );
      return true;
    } catch (error) {
      console.error("Failed to trigger Windows timer:", error);
      return false;
    }
  } else {
    console.warn(
      "⚠️ Current device does not support Shortcuts. Cannot trigger shortcut timer.",
    );
    return false;
  }
}

/**
 * 生成 Shortcut URL（供测试或手动调用）
 * @param taskTitle 任务标题
 * @returns Shortcut URL
 */
export function generateShortcutUrl(
  taskTitle: string,
  sType: "start" | "end",
): string {
  const config = getShortcutConfig(sType);
  config.taskTitle = taskTitle;
  return `shortcuts://run-shortcut?name=${encodeURIComponent(config.shortcutName)}&input=${encodeURIComponent(JSON.stringify(config))}`;
}
