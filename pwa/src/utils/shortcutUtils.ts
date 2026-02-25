/**
 * iOS Shortcut 相关工具函数
 */

/**
 * 检测是否为 iPhone / iOS 设备
 */
export function isIOSDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

/**
 * 获取 shortcut 配置
 */
export interface ShortcutConfig {
  enabled: boolean
  timerMinutes: number
  shortcutName: string // shortcut 的名称（在 iOS 中创建）
}

const DEFAULT_SHORTCUT_CONFIG: ShortcutConfig = {
  enabled: true,
  timerMinutes: 30,
  shortcutName: 'NBL_Start_Timer',
}

export function getShortcutConfig(): ShortcutConfig {
  try {
    const stored = localStorage.getItem('nbl_shortcut_config')
    return stored ? { ...DEFAULT_SHORTCUT_CONFIG, ...JSON.parse(stored) } : DEFAULT_SHORTCUT_CONFIG
  } catch {
    return DEFAULT_SHORTCUT_CONFIG
  }
}

export function setShortcutConfig(config: Partial<ShortcutConfig>): void {
  const current = getShortcutConfig()
  const updated = { ...current, ...config }
  localStorage.setItem('nbl_shortcut_config', JSON.stringify(updated))
}

/**
 * 触发 iOS Shortcut 来启动计时器
 * @param taskTitle 任务标题
 * @param taskId 任务ID
 * @param config Shortcut 配置
 * @returns 是否成功触发
 */
export function triggerShortcutTimer(taskTitle: string, taskId: string, config: ShortcutConfig): boolean {
  if (!isIOSDevice()) {
    console.log('Non-iOS device detected, skipping shortcut trigger')
    return false
  }

  if (!config.enabled) {
    console.log('Shortcut is disabled')
    return false
  }

  try {
    // 构建 Shortcut URL
    // 格式: shortcuts://run-shortcut?name=<shortcut_name>&input=<input_value>
    const shortcutUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(config.shortcutName)}&input=${encodeURIComponent(taskTitle)}`

    // 打开 shortcut
    window.location.href = shortcutUrl

    console.log(`✅ Triggered shortcut: ${config.shortcutName} with task: ${taskTitle} (${config.timerMinutes} mins)`)
    return true
  } catch (error) {
    console.error('Failed to trigger shortcut:', error)
    return false
  }
}

/**
 * 生成 Shortcut URL（供测试或手动调用）
 * @param taskTitle 任务标题
 * @returns Shortcut URL
 */
export function generateShortcutUrl(taskTitle: string): string {
  const config = getShortcutConfig()
  return `shortcuts://run-shortcut?name=${encodeURIComponent(config.shortcutName)}&input=${encodeURIComponent(taskTitle)}`
}
