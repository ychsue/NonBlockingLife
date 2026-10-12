# NBL PWA ↔ Native Shell 訊息協定（v1，由現有 Android 行為整理）

傳輸：`window.__NBL_TWA_BRIDGE__.postMessage(string)`，內容為 JSON 字串。
請求：`{ "type": "nbl:...", "requestId"?: string, ...payload }`
回應：shell 回傳含相同 `requestId` 的 JSON（`type` 為回應型別）。
`requestId` 缺省 = 單向訊息（不等待回應）。

| 請求 type | payload | 需回應 | 回應 type / 欄位 | capability |
|---|---|---|---|---|
| `nbl:ping` | — | 是 | 任意（有回應即可） | — |
| `nbl:version` | — | 是 | `nbl:version-response` | — |
| `nbl:query-alarm-setup` | — | 是 | `nbl:alarm-setup`：`{ selectedClockApp, exactAlarmAllowed }` | `alarm` |
| `nbl:query-clock-apps` | — | 是 | `nbl:clock-apps`：`{ apps, selectedPackageName }` | `alarm` |
| `nbl:select-clock-app` | `{ packageName }` | 是 | `nbl:select-clock-app-result` | `alarm` |
| `nbl:request-exact-alarm-permission` | — | 否 | — | `alarm` |
| `nbl:set-alarms` | `{ alarms: AlarmItem[] }` | 是 | `nbl:set-alarms-result`：`{ results: [{id, mode, ok, reason?}] }` | `alarm` |
| `nbl:get-alarms` | — | 是 | `nbl:alarms`：`{ alarms: [{id, mode, label, fireAt(ms)}] }`（僅桌面端） | `alarm` |
| `nbl:cancel-alarms` | `{ ids: number[] }` | 是 | `nbl:cancel-alarms-result`：`{ removed }`（僅桌面端） | `alarm` |
| `nbl:notify` | `{ title, body, id, url?, dismissOnClick? }` | 否（有 requestId 時回 `nbl:notification-shown`） | — | `notify` |
| `nbl:query-notification-permission` | — | 是 | `nbl:notification-permission-status`：`{ granted }` | `notify` |
| `nbl:fetch-ics` | `{ url: string }` | 是 | `{ icsContent: string }`；桌面端失敗時回 `{ error }` | `fetchIcs` |
| `nbl:open-external` | `{ url }`（僅 http/https） | 是 | `nbl:open-external-response`：`{ ok }` | `openExternal` |
| `nbl:share` | `{ title?, text?, url? }` | 是 | `nbl:share-response`：`{ ok }`（桌面端＝複製到剪貼簿） | `share` |

## 已實作

- `nbl:hello` → `nbl:hello-response`：`{ shell: "android"|"windows"|"linux"|"macos", shellVersion, protocolVersion: 1, capabilities: string[] }`（Android 與桌面皆已實作）。
- 未回應 `nbl:hello` 的舊版 Android shell：PWA 以 `nbl:ping`/`nbl:version` 成功視為 `twa`，並假設 capabilities 為 `alarm|notify|fetchIcs`。

## 桌面端 alarm 語意

- 桌面端自帶計時（shell 程序內），持久化於 `%LocalAppData%/NonBlockingLife/alarms.json`，視窗縮到系統匣仍會響。
- `clock` 與 `exact` 皆由同一排程處理；同一 `id` 與時間的兩者只響一次。
- `set-alarms` 為 upsert（key = `id:mode`）；撤銷用 `nbl:cancel-alarms`（依 `id`，clock/exact 一併移除）。
- 小型時鐘視窗（系統匣 →「鬧鐘與計時器」）與 PWA 共用同一份 `alarms.json`；計時器另存 `timers.json`，目前只在桌面殼內管理，尚未開放給 PWA。
- 逾期超過 1 小時的鬧鐘（例如關機期間錯過）啟動時直接丟棄；`past_time` / `invalid_time` 以 `ok:false` + `reason` 回報。

Capabilities：`alarm | notify | fetchIcs | share | openExternal`
