# Discussion 20260526 — GitHub Copilot CLI Agent 使用筆記

## 背景

今天開始使用新版 GitHub Copilot CLI Agent（Worktree 模式），因此記錄一些操作上的心得與常見問題。

---

## Q1：Worktree 裡完成的程式，要怎麼接著測？

Copilot Agent 完成後通常會建立一個 **PR（Pull Request）**，流程：

1. Agent 建立 PR（可用 `/delegate` 或 `create-pr` skill）
2. 本機 checkout 該 branch：
   ```bash
   git fetch origin
   git checkout <branch-name>
   npm install && npm test
   ```
3. 若要用 `npm run dev` 實際操作測試：
   ```bash
   ! cd pwa && npm run dev
   ```
   （使用 `!` 前綴直接在 CLI Agent 裡執行 shell 指令）

4. 或用 `/ide` 連接本機 VS Code，在 IDE 的 terminal 裡操作

---

## Q2：CLI Agent 是什麼？就是現在打字的地方嗎？

**是的**，就是目前輸入指令的這個終端機介面（Terminal）。

它不是 VS Code 的 Copilot Chat 側欄，而是一個**獨立的 CLI 程式**，在 terminal 裡執行。

---

## Q3：如何在 CLI Agent 裡執行 shell 指令（如 npm run dev）？

| 情境 | 方法 |
|------|------|
| 執行 shell 指令 | `! <指令>` 例如：`! cd pwa && npm run dev` |
| 開啟 VS Code IDE 連線 | `/ide` |
| 查看目前檔案變更 | `/diff` |

> ⚠️ 不是 `Ctrl+\`` 開 terminal，而是直接在 CLI Agent 輸入 `!` 前綴。

---

## Q4：如何加上新建的檔案或引用檔案？

| 方法 | 說明 |
|------|------|
| **直接描述需求** | 說「幫我建立 `src/xxx.ts`，內容是...」，Copilot 會自動建立 |
| **`@` 提及檔案** | 輸入 `@` 後接路徑，引用既有檔案給 Copilot 參考 |
| **`!` 執行 shell** | `! touch src/newfile.ts` 直接建立空檔案 |
| **`/diff`** | 查看目前 Copilot 做了哪些變更 |

---

## 思維轉換重點

| 舊版 VS Code + Copilot Chat | 新版 CLI Agent |
|----------------------------|---------------|
| 你主動寫 code，Copilot 輔助 | 你說需求，Copilot 主動建立/修改檔案 |
| Ctrl+\` 開 terminal 下指令 | 直接在 CLI 輸入 `!` 前綴執行指令 |
| 存檔後自己 commit/push | Copilot 自動建立 PR，你審核後 merge |
| 側欄 Chat 互動 | Terminal 裡的對話介面 |

---

---

## Q5：怎麼使用才能既節省 token，又能借用 Copilot 的能力？

### 自己來 vs. 交給 Copilot 的判斷原則

| 適合**自己來**（省 token） | 適合**交給 Copilot** |
|--------------------------|---------------------|
| `npm run dev`、`git status` 等熟悉指令 | 跨多檔案的重構、新功能實作 |
| 單一檔案的小修改 | 需要查資料 + 寫 code 的任務 |
| 已知答案的操作 | 不確定怎麼實作的問題 |
| debug 已知的 typo | 複雜 bug 的根因分析 |

### 實際建議的混合流程

```
你：Ctrl+` 開 terminal → 自己跑 dev、看 log、做熟悉的操作
        ↓ 遇到難題
你：切到 CLI Agent，描述問題，讓 Copilot 分析/寫 code
        ↓ Copilot 改完
你：/diff 看變更 → 回 terminal 自己測試
```

### 省 token 的小技巧

- **問具體問題**，不要說「幫我看整個專案」
- 用 `@檔案` 只引用**相關**的檔案，不要全丟
- 簡單的 shell 操作就用 `Ctrl+\``，不用進 CLI Agent
- `/compact` 可壓縮對話歷史，減少 context 用量

> **總結**：CLI Agent 最值錢的地方是「思考 + 跨檔案協調」，單純執行的部分自己來就好，這樣 token 最划算。

---

## 相關資源

- GitHub Copilot CLI 文件：https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli
- 常用指令：`/help`、`/diff`、`/pr`、`/ide`、`/delegate`
