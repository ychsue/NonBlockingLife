/**
 * iOS Shortcut 及 Android Automate 相關工具函數
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

// ─────────────────────────────────────────────────────────────────────────────
// Android Automate (LlamaLab) 相關設定
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Android Automate flow 的啟動參數
 */
export interface AutomateConfig {
  /** Automate 中建立的 flow 名稱（需與 .flo 檔匹配） */
  flowName: string;
  /** true = 開始計時，false = 結束計時（取消通知） */
  started: boolean;
  taskTitle?: string;
  timerMinutes: number;
}

const DEFAULT_START_AUTOMATE_CONFIG: AutomateConfig = {
  flowName: "NBL_Timer",
  started: true,
  timerMinutes: 30,
};

const DEFAULT_END_AUTOMATE_CONFIG: AutomateConfig = {
  flowName: "NBL_Timer",
  started: false,
  timerMinutes: 10,
};

export function getAutomateConfig(sType: "start" | "end"): AutomateConfig {
  try {
    const stored = localStorage.getItem("nbl_automate_config");
    if (sType === "start") {
      return stored
        ? { ...DEFAULT_START_AUTOMATE_CONFIG, ...JSON.parse(stored) }
        : DEFAULT_START_AUTOMATE_CONFIG;
    } else {
      return stored
        ? { ...DEFAULT_END_AUTOMATE_CONFIG, ...JSON.parse(stored) }
        : DEFAULT_END_AUTOMATE_CONFIG;
    }
  } catch {
    return sType === "start"
      ? DEFAULT_START_AUTOMATE_CONFIG
      : DEFAULT_END_AUTOMATE_CONFIG;
  }
}

export function setAutomateConfig(
  config: Partial<AutomateConfig>,
  sType: "start" | "end",
): void {
  const current = getAutomateConfig(sType);
  const updated = { ...current, ...config };
  localStorage.setItem("nbl_automate_config", JSON.stringify(updated));
}

/**
 * 建構觸發 Automate flow 的 Android intent URL。
 *
 * 使用 Automate 的 start-by-name 機制：
 *   action  = net.llamalab.automate.intent.action.START
 *   package = net.llamalab.automate
 *   extras  = FLOW_NAME (String) + VARIABLES (JSON String)
 *
 * Flow 收到後，VARIABLES 裡的 key 直接成為 flow 內的變數。
 */
export function buildAutomateIntentUrl(config: AutomateConfig): string {
  // 1. 改用廣播的 Action（自訂一個 unique 的 action 名稱，例如 net.nbl.timer.ACTION）
  const action = "net.nbl.timer.ACTION";
  
  // 2. 將變數直接拆解為獨立的 Extra 傳入
  const varStarted = `S.started=${encodeURIComponent(config.started ? "true" : "false")}`;
  const varMinutes = `S.timerMinutes=${encodeURIComponent(config.timerMinutes.toString())}`;
  const varTitle = `S.taskTitle=${encodeURIComponent(config.taskTitle ?? "")}`;

  // 組合標準 Android Broadcast Intent 網址
  // 注意：這裡移除了 package，改用廣播機制，Automate 的廣播接收器會去監聽這個 Action
  return `intent://#Intent;action=${action};${varStarted};${varMinutes};${varTitle};end`;
}
/**
 * 觸發 Android Automate flow
 */
export function triggerAutomateFlow(
  taskTitle: string,
  config: AutomateConfig,
): boolean {
  try {
    const fullConfig = { ...config, taskTitle };
    const intentUrl = buildAutomateIntentUrl(fullConfig);
    window.location.href = intentUrl;
    console.log(
      `✅ Triggered Automate flow: ${config.flowName} with task: ${taskTitle} (started=${config.started})`,
    );
    return true;
  } catch (error) {
    console.error("Failed to trigger Automate flow:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 統一入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 触发 iOS Shortcut / Android Automate / Windows 計時器
 * @param taskTitle 任务标题
 * @param taskId 任务ID
 * @param config Shortcut 配置（iOS/Windows 用）
 * @param automateConfig Automate 配置（Android 用），若不傳則從 localStorage 讀取
 * @returns 是否成功触发
 */
export function triggerShortcutTimer(
  taskTitle: string,
  taskId: string,
  config: ShortcutConfig,
  automateConfig?: AutomateConfig,
): boolean {
  config = { ...config, taskTitle };
  const deviceType = getDeviceType();

  if (deviceType === "Shortcuts") {
    try {
      // 格式: shortcuts://run-shortcut?name=<shortcut_name>&input=<input_value>
      const shortcutUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(config.shortcutName)}&input=${encodeURIComponent(JSON.stringify(config))}`;
      window.location.href = shortcutUrl;
      console.log(
        `✅ Triggered shortcut: ${config.shortcutName} with task: ${taskTitle} (${config.timerMinutes} mins)`,
      );
      return true;
    } catch (error) {
      console.error("Failed to trigger shortcut:", error);
      return false;
    }
  } else if (deviceType === "Android") {
    const aConfig = automateConfig ?? getAutomateConfig(config.started ? "start" : "end");
    return triggerAutomateFlow(taskTitle, { ...aConfig, taskTitle });
  } else if (deviceType === "Windows") {
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
      "⚠️ Current device does not support automation. Cannot trigger timer.",
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
