# 發佈到 GAS 的方法

1. 先記得在設定好您要用來管理時間的 `試算表(Sheets)` (範本在[2026NonBlockingLife.xlsx](../sheets/2026NonBlockingLife.xlsx))後，選
    > 擴充功能 -> App Scripts
2.  **部署**：在 GAS 編輯器點擊「部署」>「新部署」，類型選「網頁應用程式」，**權限設定為「任何人」** (這很重要，否則 iPhone 捷徑連不進來)。
3.  **取得網址**：複製部署後產生的 `script.google.com` 網址。
4.  **iPhone 捷徑測試**：
    -   在 iPhone 上建立一個新捷徑。
    -   使用「取得 URL 內容」動作，方法選 `POST`。
    -   Body 選 JSON，加入 `action: START`, `taskName: 測試專案`。
    -   執行捷徑，看看您的試算表 `Log` 有沒有自動跳出一行！
  
## 測試

``` ps1
$body = @{action="START"
     taskName="測試專案"}|ConvertTo-Json -Compress
curl -Uri "https://script.google.com/macros/s/YOUR_KEY/exec" `
     -Method POST `
     -ContentType "application/json; charset=utf-8" `
     -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```

## 用 VSCode 開發

Copilot 的回答，而且有效：

## [Apps Script in VSCode](https://www.bing.com/ck/a?!&&p=a9e2bfa5b215bca5cf46d36101d9f9dd8c80ac202e818f26a650dc0853526fb6JmltdHM9MTc2ODQzNTIwMA&ptn=3&ver=2&hsh=4&fclid=29503925-39ff-6fe4-15e9-2cc838ef6e8f&psq=vscode+test+google+app+scripts&u=a1aHR0cHM6Ly9oYWNrZXJub29uLmNvbS93cml0aW5nLWdvb2dsZS1hcHBzLXNjcmlwdC1jb2RlLWxvY2FsbHktaW4tdnNjb2Rl&ntb=1)

You can write and manage Google Apps Script projects locally using Visual Studio Code (VSCode) with the help of the _clasp_ command-line tool.
This setup allows you to leverage the powerful features of VSCode for your Apps Script development.

Example

-   **Install Clasp**:

``` ps1
npm install \-g @google/clasp
```

-   **Authenticate Clasp**:

``` ps1
clasp login
```

-   **Create a New Project**:

``` ps1
clasp create --type standalone --title "My Project"
```

-   **Clone an Existing Project**:

``` ps1
clasp clone <scriptId>
```

-   **Open the Project in VSCode**:

``` ps1
code
```

-   **Push Changes to Google Apps Script**:

``` ps1
clasp push
```

### Important Considerations

-   **Authentication**: Ensure you are authenticated with your Google account using _clasp login_.
-   **Project ID**: You need the script ID of your Google Apps Script project to clone it.
-   **File Structure**: The _clasp_ tool will manage the file structure, including necessary configuration files like _.clasp.json_.

By following these steps, you can efficiently develop and manage your Google Apps Script projects using VSCode.
This setup enhances your development workflow by providing a robust environment for coding, debugging, and version control.
