# NBL PWA ↔ Native Shell 訊息協定（v1，由現有 Android 行為整理）

傳輸：`window.__NBL_TWA_BRIDGE__.postMessage(string)`，內容為 JSON 字串。
請求：`{ "type": "nbl:...", "requestId"?: string, ...payload }`
回應：shell 回傳含相同 `requestId` 的 JSON（`type` 為回應型別）。
`requestId` 缺省 = 單向訊息（不等待回應）。

| 請求 type | payload | 需回應 | 回應 type / 欄位 | capability |
|---|---|---|---|---|
| `nbl:ping` | — | 是 | 任意（有回應即可） | — |
| `nbl:version` | — | 是 | `nbl:version-response` | — |
| `nbl:query-alarm-setup` | — | 是 | 依 Android 實作 | `alarm` |
| `nbl:query-clock-apps` | — | 是 | 依 Android 實作 | `alarm` |
| `nbl:request-exact-alarm-permission` | — | 否 | — | `alarm` |
| `nbl:set-alarms` | `{ alarms: AlarmItem[] }` | 是 | 依 Android 實作 | `alarm` |
| `nbl:query-notification-permission` | — | 是 | `nbl:notification-permission-status` | `notify` |
| `nbl:fetch-ics` | `{ url: string }` | 是 | `{ icsContent: string }` | `fetchIcs` |

## 規劃中（階段 2）

- `nbl:hello` → `nbl:hello-response`：`{ shell: "android"|"windows"|"linux"|"macos", shellVersion, protocolVersion: 1, capabilities: string[] }`
- 未回應 `nbl:hello` 的舊版 Android shell：PWA 以 `nbl:ping`/`nbl:version` 成功視為 `twa`，並假設 capabilities 為 `alarm|notify|fetchIcs`。

Capabilities：`alarm | notify | fetchIcs | share | openExternal`
