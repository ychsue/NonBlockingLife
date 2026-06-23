# 規劃

Optimized tool selection我来帮您准备隐私权政策网页。首先让我查看一下项目的结构。

Read [](file:///c%3A/Users/hsuy1/source/repos/NonBlockingLife/pwa/public)

Read [](file:///c%3A/Users/hsuy1/source/repos/NonBlockingLife/pwa/src)

Read [](file:///c%3A/Users/hsuy1/source/repos/NonBlockingLife/package.json)

非常好！我来帮您准备隐私权政策网页。首先，我需要了解一些信息。根据我看到的项目信息：

**基本情況：**
- 應用名稱：NonBlockingLife
- Package ID：com.yescirculation.nonblockinglife
- Host：ychsue.github.io

**建議方案：**
是的，在 public 中放置隱私權政策是個好主意。可以新增 `privacy-policy.html` 檔案。

**我需要了解以下資訊來撰寫完整的隱私權政策：**

1. **應用功能**：NonBlockingLife 會收集哪些用戶數據？
   - 例如：任務/待辦事項數據、用戶偏好設定、使用統計等？
   - A: 這個應用完全不收集使用者的數據，甚至可離線運作，至於使用者想要放YouTube連結或其他的如AI分析，那是使用者自己的事

2. **數據存儲**：
   - 數據是存儲在本地（IndexedDB/LocalStorage）還是上傳到伺服器？
   - 使用了 Google Sheets/Google Apps Script 嗎？（我看到 gas 資料夾）
   - A: 數據只存在使用者的本地，若他們想要使用 Google Sheets/Google Apps Script來做與其他自己的裝置同步，我有教他們怎麼用自己的Google帳號打通GAS到Google Sheets 的路，然後，這個APP就可以透過他們自己的GAS得到的 ..../exec 來IO他自己的Google Sheets，這個APP完全不會收集使用者的任何資料，甚至連使用者的Google帳號都不會知道。

3. **第三方服務**：
   - 是否使用 Google Analytics 或其他追蹤服務？
   - 是否使用 Firebase 或其他 Google 服務？
   - 通知功能（我看到 `enableNotifications: true`）如何運作？
   - A: 前兩個沒有，第三個是因為這個APP有模擬番茄時鐘法的概念，所以，需要提醒使用者，除了在開始或結束一個task時會自動打開clock的APP外，他需要提醒使用者現在在甚麼狀態，因此才需要 Notification。

4. **用戶信息**：
   - 是否需要用戶帳戶/登入？
   - 是否收集任何個人可識別信息（如電子郵件、位置等）？
   - A: 不需要登入，也不收集任何個人可識別信息。

5. **其他**：
   - 應用所有者的聯絡信息（公司名稱、電子郵件、地址）？
   - 支援哪些語言？（我看到有 i18n 支援）
   - A: 主要為中文，部分支援英文與日文。第一條我不懂？這個商店上面不也會有嗎？而我裡面的教學YouTube影片可以跑到我的帳號，這樣算嗎？喔，有個條目(使用者可刪除)是連到 Superconductor-like Society 的網頁，因為那才是這個APP參與的終極目標

請提供這些信息，我會為您準備一份完整的隱私權政策網頁！

---

非常感謝詳細的說明！這個信息非常充分。讓我先看看您已經準備的 `privacy-policy.md` 檔案：

Read [](file:///c%3A/Users/hsuy1/source/repos/NonBlockingLife/Discussion/twa/privacy-policy.md)

好的！信息非常清楚。让我澄清一下您提出的几个问题，然后为您准备隐私权政策网页：

**澄清事项：**

1. ✅ **Google Play 商店信息** - Google Play 上会显示基本的应用信息，但隐私权政策仍需要独立的详细说明。我建议用您的 GitHub 或个人联系方式。

2. ✅ **YouTube 链接** - 这不算收集数据，用户点击YouTube只是导向另一个网站，完全透明。

3. 🌐 **語言支持** - 由于应用支持多语言，我建议**至少准备英文版本**（除了繁体中文），以符合 Google Play 要求。

**我还需要一些信息：**

1. **聯絡方式** - 為了隱私權政策，我需要：
   - 開發者/公司名稱？（如：個人、YESCIRCULATION 或其他？）
   - 聯絡電子郵件？
   - 網站？（如：ychsue.github.io）
   - A: Young-Chung Hsue/ YesCirculation Solutions /,    [yescirculation@gmail.com](mailto:yescirculation@gmail.com),  ychsue.github.io/NonBlockingLife

2. **Superconductor-like Society 網頁的URL** - 方便我在隱私權政策中放入連結
    - A: [Superconductor-like Society](https://ychsue.github.io/superconductorlike_society/)

3. **語言偏好** - 要準備：
   - ✅ 繁体中文（必須）
   - A: 英文版本    ，那麼，我給Google Play Console 應該填哪一個呢？

提供這些信息後，我會為您在 public 建立完整的隱私權政策 HTML 檔案。
