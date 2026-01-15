# NonBlockingLife (NBL) 系統規格書

## ID 系統

- 所有條目（Task, Inbox, Micro）統一使用 `generateId()` 產生的 Base36 時間戳 ID。
- ID 作為跨工作表（Sheet）關聯的唯一憑證。

## 狀態管理 (GAS Config)

- **System State**: IDLE, RUNNING, BLOCKING.
- **Task Status**: PENDING, DOING, DONE, WAITING.

## 自動化邏輯

- **Start**: Log(START) + Dashboard(Write) + Pool(Status=DOING).
- **End**: Log(END) + Dashboard(Clear) + Pool(Status=DONE, Accumulate Time).
