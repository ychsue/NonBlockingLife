# iOS Shortcut 集成指南

## 概述

NonBlockingLife PWA 现在支持在 iPhone 上自动启动计时器。当您在应用中开始任务时，系统会自动调用 iOS 快捷指令来启动计时器。

## 工作原理

1. 在 iPhone 上使用 PWA
2. 点击"开始任务"
3. 系统自动检测到是 iOS 设备
4. 调用 iOS 快捷指令 `NBL_Start_Timer`（可配置）
5. 快捷指令启动一个计时器，时长为配置的分钟数（默认 30 分钟）

## 配置步骤

### 1. 在 iOS 快捷指令应用中创建快捷指令

**打开快捷指令应用** → **"快捷指令"标签页** → **创建快捷指令**

### 2. 添加计时器操作

在快捷指令编辑器中：

1. 点击"+"添加新操作
2. 搜索并选择"计时器"或"显示计时器"
3. 设置时长参数为 30 分钟（或您配置的值）
4. 点击"完成"

示例快捷指令脚本：

``` js
接收 "询问文本"
显示计时器 [30] 分钟
... 其他操作（可选）...
```

### 3. 命名快捷指令

将快捷指令命名为 `NBL_Start_Timer`（或在应用配置中修改）

### 4. 在 PWA 中配置

在 PWA 应用的设置中：

- 启用 Shortcut 功能
- 设置计时器时长（分钟）
- 输入快捷指令名称

## 配置管理

### 在应用中访问配置

```typescript
import { ShortcutConfig } from '@/components/ShortcutConfig'

// 在您的设置页面中加入
<ShortcutConfig />
```

### 手动配置（localStorage）

配置存储在 localStorage 中，默认值：

```javascript
{
  enabled: true,
  timerMinutes: 30,
  shortcutName: 'NBL_Start_Timer'
}
```

可通过浏览器开发者工具修改。

## 故障排查

| 问题 | 原因 | 解决方案 |
| ------ | ------ | -------- |
| Shortcut 未触发 | 设备不是 iPhone | 只有 iOS 设备支持 shortcuts:// 协议 |
| 打开错误的快捷指令 | 快捷指令名称不匹配 | 检查 PWA 配置中的名称与 iOS 快捷指令名称是否一致 |
| 快捷指令无法运行 | 权限问题 | 在 iOS 设置 → 快捷指令中允许"不受信任的快捷指令" |

## API 参考

### `shortcutUtils.ts`

```typescript
// 检测是否为 iOS 设备
isIOSDevice(): boolean

// 获取当前配置
getShortcutConfig(): ShortcutConfig

// 保存配置
setShortcutConfig(config: Partial<ShortcutConfig>): void

// 触发计时器（由应用自动调用）
triggerShortcutTimer(taskTitle: string, taskId: string): boolean

// 生成 Shortcut URL（用于测试）
generateShortcutUrl(taskTitle: string): string
```

## 未来计划

- [ ] 支持 Android 设备（Toast/通知）
- [ ] 支持 Windows/Linux（系统通知）
- [ ] 自定义 Shortcut 参数传递
- [ ] 任务完成时自动停止计时器
