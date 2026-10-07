// pwa/src/components/SetupWizard.tsx

import { useState } from "react";
import gasCode from "../gas/程式碼.js?raw";
import { useT, useTWithMaps } from "../i18n";
import { useAppStore } from "../store/appStore";
import { satisfies } from "compare-versions";

interface SetupWizardProps {
  isModal?: boolean;
  onComplete?: (url: string) => void;
  onClose?: () => void;
}

export function SetupGASWizard({
  isModal = false,
  onComplete,
  onClose,
}: SetupWizardProps) {
  const t = useT();
  const locale = useAppStore((state) => state.locale);
  const [step, setStep] = useState(1);
  const [gasUrl, setGasUrl] = useState("");
  const setSyncType = useAppStore((state) => state.setSyncType);
  const tHere = useTWithMaps({
    "zh-TW": {
      "GAS 設置": "GAS 設置",
      版本不匹配: "版本不匹配",
      前端: "前端",
      "請更新 GAS 腳本": "請更新 GAS 腳本",
      首次同步設置: "首次同步設置",
      "4 步完成設置，您的數據將存儲在您自己的 Google Drive":
        "4 步完成設置，您的數據將存儲在您自己的 Google Drive",
      "建議改使用 Supabase 同步": "建議改使用 Supabase 同步",
      "Sync 設定影片": "Sync 設定影片",
      "建議先看 1 次影片，照著做會更快完成設定。":
        "建議先看 1 次影片，照著做會更快完成設定。",
      "步驟 1: 建立 Google Sheet": "步驟 1: 建立 Google Sheet",
      打開: "打開",
      "建立新試算表，命名為": "建立新試算表，命名為",
      "可選：放入您自己的資料夾（例如 NBL）":
        "可選：放入您自己的資料夾（例如 NBL）",
      "步驟 2: 從 Sheet 開啟 Apps Script（綁定模式）":
        "步驟 2: 從 Sheet 開啟 Apps Script（綁定模式）",
      "觀看 YouTube": "觀看 YouTube",
      "在剛建立的 Sheet 中點選「擴充功能」→「Apps Script」":
        "在剛建立的 Sheet 中點選「擴充功能」→「Apps Script」",
      "這會建立 bound script，可直接使用": "這會建立 bound script，可直接使用",
      "不需要手動填 SPREADSHEET_ID": "不需要手動填 SPREADSHEET_ID",
      "步驟 3: 貼上同步程式碼": "步驟 3: 貼上同步程式碼",
      "步驟 4: 部署為 Web 應用程式": "步驟 4: 部署為 Web 應用程式",
      "複製 Apps Script 程式碼": "複製 Apps Script 程式碼",
      "在 Apps Script 編輯器中貼上剛才複製的程式碼":
        "在 Apps Script 編輯器中貼上剛才複製的程式碼",
      "儲存（Ctrl+S）": "儲存（Ctrl+S）",
      "點擊「部署」→「新部署」": "點擊「部署」→「新部署」",
      "選擇「Web 應用程式」": "選擇「Web 應用程式」",
      "執行身份：": "執行身份：",
      我: "我",
      "誰可以訪問：": "誰可以訪問：",
      任何人: "任何人",
      "點擊「部署」": "點擊「部署」",
      "複製「Web 應用程式 URL」（結尾通常是":
        "複製「Web 應用程式 URL」（結尾通常是",
      "輸入您的 Web App URL": "輸入您的 Web App URL",
      "請貼上從 Google Apps Script 部署後取得的 URL":
        "請貼上從 Google Apps Script 部署後取得的 URL",
      "）": "）",
      "下一步：輸入 URL →": "下一步：輸入 URL →",
      "保存並測試連接": "保存並測試連接",
      "設置完成！": "設置完成！",
      "您現在可以開始使用同步功能了": "您現在可以開始使用同步功能了",
      完成: "完成",
    },
    en: {
      "GAS 設置": "GAS Setup",
      版本不匹配: "Versions do not match",
      前端: "Frontend",
      "請更新 GAS 腳本": "Please update the GAS script",
      首次同步設置: "Initial Sync Setup",
      "4 步完成設置，您的數據將存儲在您自己的 Google Drive":
        "Complete the setup in 4 steps, and your data will be stored in your own Google Drive",
      "建議改使用 Supabase 同步": "It is recommended to use Supabase for sync",
      "Sync 設定影片": "Sync Setup Video",
      "建議先看 1 次影片，照著做會更快完成設定。":
        "It is recommended to watch the video once first, and following it will help you complete the setup faster.",
      "步驟 1: 建立 Google Sheet": "Step 1: Create a Google Sheet",
      打開: "Open",
      "建立新試算表，命名為": "Create a new spreadsheet named",
      "可選：放入您自己的資料夾（例如 NBL）":
        "Optional: Place it in your own folder (e.g., NBL)",
      "步驟 2: 從 Sheet 開啟 Apps Script（綁定模式）":
        "Step 2: Open Apps Script from the Sheet (Bound Mode)",
      "觀看 YouTube": "Watch on YouTube",
      "在剛建立的 Sheet 中點選「擴充功能」→「Apps Script」":
        "Click 'Extensions' → 'Apps Script' in the newly created Sheet",
      "這會建立 bound script，可直接使用":
        "This will create a bound script that ",
      "不需要手動填 SPREADSHEET_ID":
        " can be used directly. No need to manually fill in SPREADSHEET_ID",
      "步驟 3: 貼上同步程式碼": "Step 3: Paste the sync code",
      "步驟 4: 部署為 Web 應用程式": "Step 4: Deploy as a Web App",
      "複製 Apps Script 程式碼": "Copy the Apps Script code",
      "在 Apps Script 編輯器中貼上剛才複製的程式碼":
        "Paste the copied code into the Apps Script editor",
      "儲存（Ctrl+S）": "Save (Ctrl+S)",
      "點擊「部署」→「新部署」": "Click 'Deploy' → 'New deployment'",
      "選擇「Web 應用程式」": "Select 'Web App'",
      "執行身份：": "Execute as:",
      我: "Me",
      "誰可以訪問：": "Who has access:",
      任何人: "Anyone",
      "點擊「部署」": "Click 'Deploy'",
      "複製「Web 應用程式 URL」（結尾通常是":
        "Copy the 'Web App URL' (usually ending with",
      "）": ")",
      "輸入您的 Web App URL": "Enter your Web App URL",
      "請貼上從 Google Apps Script 部署後取得的 URL":
        "Paste the URL obtained from deploying Google Apps Script",
      "下一步：輸入 URL →": "Next: Enter URL →",
      "保存並測試連接": "Save and test the connection",
      "設置完成！": "Setup Complete!",
      "您現在可以開始使用同步功能了": "You can now start using the sync feature",
      完成: "Complete",
    },
    ja: {
      "GAS 設置": "GAS 設置",
      版本不匹配: "バージョンが一致しません",
      前端: "フロントエンド",
      "請更新 GAS 腳本": "GAS スクリプトを更新してください",
      首次同步設置: "初回同期の設定",
      "4 步完成設置，您的數據將存儲在您自己的 Google Drive":
        "4 ステップで設定を完了すると、データは自分の Google Drive に保存されます。",
      "建議改使用 Supabase 同步": "Supabase 同期を使用することをお勧めします",
      "Sync 設定影片": "Sync 設定影片",
      "建議先看 1 次影片，照著做會更快完成設定。":
        "最初に 1 回ビデオを見て、それに従うと設定をより早く完了できます。",
      "步驟 1: 建立 Google Sheet": "ステップ 1: Google シートを作成",
      打開: "開く",
      "建立新試算表，命名為":
        "新しいスプレッドシートを作成し、次の名前を付けます",
      "可選：放入您自己的資料夾（例如 NBL）":
        "オプション: 自分のフォルダに配置 (例: NBL)",
      "步驟 2: 從 Sheet 開啟 Apps Script（綁定模式）":
        "ステップ 2: シートから Apps Script を開く (バウンド モード)",
      "觀看 YouTube": "YouTube で見る",
      "在剛建立的 Sheet 中點選「擴充功能」→「Apps Script」":
        "新しく作成したシートで「拡張機能」→「Apps Script」をクリック",
      "這會建立 bound script，可直接使用":
        "これにより、バウンドスクリプトが作成され、直接使用できます。",
      "不需要手動填 SPREADSHEET_ID":
        "SPREADSHEET_ID を手動で入力する必要はありません",
      "步驟 3: 貼上同步程式碼": "ステップ 3: 同期コードを貼り付け",
      "步驟 4: 部署為 Web 應用程式": "ステップ 4: Web アプリとしてデプロイ",
      "複製 Apps Script 程式碼": "Apps Script コードをコピー",
      "在 Apps Script 編輯器中貼上剛才複製的程式碼":
        "Apps Script エディタにコピーしたコードを貼り付け",
      "儲存（Ctrl+S）": "保存 (Ctrl+S)",
      "點擊「部署」→「新部署」": "「デプロイ」→「新しいデプロイ」をクリック",
      "選擇「Web 應用程式」": "「Web アプリ」を選択",
      "執行身份：": "実行者:",
      我: "自分",
      "誰可以訪問：": "アクセスできる人:",
      任何人: "誰でも",
      "點擊「部署」": "「デプロイ」をクリック",
      "複製「Web 應用程式 URL」（結尾通常是":
        "「Web アプリ URL」をコピー（通常は",
      "）": ")",
      "輸入您的 Web App URL": "ウェブアプリのURLを入力してください",
      "請貼上從 Google Apps Script 部署後取得的 URL":
        "Google Apps Script のデプロイ後に取得した URL を貼り付けてください",
      "下一步：輸入 URL →": "次へ: URL を入力 →",
      "保存並測試連接": "接続を保存してテストする ...",
      "設置完成！": "設定完了！",
      "您現在可以開始使用同步功能了": "これで同期機能を使用開始できます",
      完成: "完了",
    },
  });

  const syncTutorialVideo =
    locale === "zh-TW"
      ? {
          title: "中文解說：NBL Sync 設定教學",
          url: "https://www.youtube.com/watch?v=qjv0mCWWOkE",
        }
      : {
          title: "English Walkthrough: NBL Sync Setup",
          url: "https://www.youtube.com/watch?v=ENxoDT85VfM",
        };

  const handleCopyGASCode = () => {
    navigator.clipboard.writeText(gasCode);
    alert(`✅ ${t("setup.codeCopied")}`);
  };

  const handleComplete = async () => {
    if (onComplete) {
      await onComplete(gasUrl);
    }
    if (isModal && onClose) {
      onClose();
    }
  };

  // 處理步驟 2 的保存和測試
  const handleSaveAndTest = async () => {
    // 驗證 URL 格式
    if (!gasUrl || !gasUrl.includes("script.google.com")) {
      alert(`❌ ${t("setup.invalidGasUrl")}`);
      return;
    }

    // 測試連接
    try {
      const response = await fetch(gasUrl + "?action=ping", {
        cache: "no-store",
      });
      const data = await response.json();

      if (
        !!!satisfies(import.meta.env.__APP_VERSION__, data.version ?? "0.0.0")
      ) {
        confirm(
          `⚠️ ${tHere("版本不匹配")}：${tHere("前端")} ${import.meta.env.__APP_VERSION__}，GAS "${data.version}"。${tHere("請更新 GAS 腳本")}`,
        );
        setStep(3);
        return;
      }

      if (data.status === "ok") {
        // 保存到 localStorage
        localStorage.setItem("gasWebAppUrl", gasUrl);
        // 如果是 modal，直接調用 onComplete；否則進到第 3 步
        if (isModal) {
          handleComplete();
        } else {
          setStep(3);
        }
      }
    } catch (e) {
      alert(`❌ ${t("setup.connectFailed")}`);
    }
  };

  const content = (
    <div className="space-y-6">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              🚀 {tHere("首次同步設置")}
            </h2>
            <p className="text-gray-600">
              {tHere("4 步完成設置，您的數據將存儲在您自己的 Google Drive")}
            </p>
            <button
              onClick={() => setSyncType("supabase")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              {tHere("建議改使用 Supabase 同步")}
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-red-900">
              🎬 {tHere("Sync 設定影片")}
            </h3>
            <p className="text-sm text-red-800">
              {tHere("建議先看 1 次影片，照著做會更快完成設定。")}
            </p>
            <a
              href={syncTutorialVideo.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              {tHere("觀看 YouTube")}：{syncTutorialVideo.title}
            </a>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">
              {tHere("步驟 1: 建立 Google Sheet")}
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>
                {tHere("打開")}{" "}
                <a
                  href="https://sheets.google.com"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Google Sheets
                </a>
              </li>
              <li>
                {tHere("建立新試算表，命名為")}{" "}
                <strong>NonBlockingLife Data</strong>
              </li>
              <li>{tHere("可選：放入您自己的資料夾（例如 NBL）")}</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-green-900">
              {tHere("步驟 2: 從 Sheet 開啟 Apps Script（綁定模式）")}
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>
                {tHere("在剛建立的 Sheet 中點選「擴充功能」→「Apps Script」")}
              </li>
              <li>
                {tHere("這會建立 bound script，可直接使用")}{" "}
                <code className="bg-white px-1 py-0.5 rounded text-xs">
                  getActiveSpreadsheet()
                </code>
              </li>
              <li>{tHere("不需要手動填 SPREADSHEET_ID")}</li>
            </ol>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-purple-900">
              {tHere("步驟 3: 貼上同步程式碼")}
            </h3>
            <button
              onClick={handleCopyGASCode}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              📋 {tHere("複製 Apps Script 程式碼")}
            </button>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>{tHere("在 Apps Script 編輯器中貼上剛才複製的程式碼")}</li>
              <li>{tHere("儲存（Ctrl+S）")}</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-amber-900">
              {tHere("步驟 4: 部署為 Web 應用程式")}
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>{tHere("點擊「部署」→「新部署」")}</li>
              <li>{tHere("選擇「Web 應用程式」")}</li>
              <li>
                {tHere("執行身份：")}
                <strong>{tHere("我")}</strong>
              </li>
              <li>
                {tHere("誰可以訪問：")}
                <strong>{tHere("任何人")}</strong>
              </li>
              <li>{tHere("點擊「部署」")}</li>
              <li>
                {tHere("複製「Web 應用程式 URL」（結尾通常是")}{" "}
                <code className="bg-white px-1 py-0.5 rounded text-xs">
                  /exec
                </code>
                {tHere("）")}
              </li>
            </ol>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              {tHere("下一步：輸入 URL →")}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              🔗 {tHere("輸入您的 Web App URL")}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {tHere("請貼上從 Google Apps Script 部署後取得的 URL")}
            </p>
          </div>
          <input
            type="text"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSaveAndTest}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            ✅ {tHere("保存並測試連接")}
          </button>
        </div>
      )}

      {step === 3 && !isModal && (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600">{tHere("設置完成！")}</h2>
          <p className="text-gray-600">{tHere("您現在可以開始使用同步功能了")}</p>
          <button
            onClick={handleComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            {tHere("完成")}
          </button>
        </div>
      )}
    </div>
  );

  // 如果是 modal 模式
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h1 className="text-lg font-bold">{tHere("GAS 設置")}</h1>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            )}
          </div>
          <div className="p-6">{content}</div>
        </div>
      </div>
    );
  }

  return content;
}
