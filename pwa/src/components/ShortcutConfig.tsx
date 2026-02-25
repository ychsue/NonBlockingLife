import { useState } from 'react'
import { getShortcutConfig, setShortcutConfig, isIOSDevice, generateShortcutUrl, type ShortcutConfig } from '../utils/shortcutUtils'

export function ShortcutConfig() {
  const [config, setConfig] = useState<ShortcutConfig>(getShortcutConfig())
  const [isIOS] = useState(isIOSDevice())
  const [saved, setSaved] = useState(false)

  const handleChange = (key: keyof ShortcutConfig, value: unknown) => {
    const updated = { ...config, [key]: value }
    setConfig(updated)
    setSaved(false)
  }

  const handleSave = () => {
    setShortcutConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const testShortcutUrl = generateShortcutUrl('Test Task')

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4">iOS Shortcut 配置</h2>

      {!isIOS && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ 当前设备非 iOS，Shortcut 功能不可用
        </div>
      )}

      {isIOS && (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                启用 Shortcut
              </label>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="ml-2 text-sm text-gray-600">
                {config.enabled ? '已启用' : '已禁用'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                计时器时长（分钟）
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={config.timerMinutes}
                onChange={(e) => handleChange('timerMinutes', parseInt(e.target.value) || 30)}
                className="w-20 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">
                开始任务时会自动启动 {config.timerMinutes} 分钟的计时器
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Shortcut 名称
              </label>
              <input
                type="text"
                value={config.shortcutName}
                onChange={(e) => handleChange('shortcutName', e.target.value)}
                className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
              <span className="text-xs text-gray-500 mt-1">
                注：需要在 iOS 快捷指令中创建同名的快捷指令
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={handleSave}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {saved ? '✅ 已保存' : '保存配置'}
            </button>

            {config.enabled && (
              <a
                href={testShortcutUrl}
                className="block w-full px-4 py-2 text-center bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                测试 Shortcut
              </a>
            )}
          </div>

          {config.enabled && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>使用说明：</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>在 iOS 快捷指令应用中创建一个名为 "<code className="bg-white px-1">{config.shortcutName}</code>" 的快捷指令</li>
                <li>该快捷指令应该启动一个计时器，时长为 {config.timerMinutes} 分钟</li>
                <li>当您在此应用中开始任务时，计时器会自动启动</li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
