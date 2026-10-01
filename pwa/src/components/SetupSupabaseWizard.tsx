// pwa/src/components/SetupWizard.tsx

import { useState } from "react";
import supabaseCode from "../db/supabase/initialize.sql?raw";
import { useT } from "../i18n";
import { useAppStore } from "../store/appStore";
import { satisfies } from "compare-versions";
import {
  getUrlAndKey,
  SupabaseSyncManager,
} from "../utils/SupabaseSyncManager";
import { strToJsx } from "./strToJsx";

interface SetupWizardProps {
  isModal?: boolean;
  onComplete?: (url: string) => void;
  onClose?: () => void;
}

export function SetupSupabaseWizard({
  isModal,
  onComplete,
  onClose,
}: SetupWizardProps) {
  const t = useT();
  const locale = useAppStore((state) => state.locale);
  const [step, setStep] = useState(1);
  const [syncStr, setSyncStr] = useState("");
  const setSyncType = useAppStore((state) => state.setSyncType);

  const syncTutorialVideo =
    locale === "zh-TW"
      ? {
          title: "TODO 中文解說：NBL Supabase Sync 設定教學",
          url: "https://www.youtube.com/watch?v=qjv0mCWWOkE",
        }
      : {
          title: "TODO English Walkthrough: NBL Supabase Sync Setup",
          url: "https://www.youtube.com/watch?v=ENxoDT85VfM",
        };

  const handleCopySQLCode = () => {
    navigator.clipboard.writeText(supabaseCode);
    alert(`✅ ${t("setup.codeCopied")}`);
  };

  const handleComplete = async () => {
    if (onComplete) {
      onComplete(syncStr);
    }
    if (onClose) {
      onClose();
    }
  };

  // 處理步驟 2 的保存和測試
  const handleSaveAndTest = async () => {
    // 驗證 syncStr 格式
    try {
      getUrlAndKey(syncStr);
    } catch (e) {
      alert(`❌ ${t("setup.invalidSupabaseUrlKey")}`);
      setStep(2);
      return;
    }

    // 測試連接
    try {
      const manager = new SupabaseSyncManager(syncStr);
      const ok = await manager.testConnection();
      if (!ok) {
        alert(`❌ ${t("setup.connectFailed")}`);
        setStep(5);
        return;
      }
      setStep(3);
    } catch (e) {
      alert(`❌ ${t("setup.connectFailed")}`);
      setStep(5);
    }
  };

  const content = (
    <div className="space-y-6">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">🚀 首次與更新同步設置</h2>
            <p className="text-gray-600">
              4 步完成設置，您的數據將存儲在您自己的 Supabase 資料庫中
            </p>
            <button
              onClick={() => setSyncType("gas")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              改用 GAS 同步(較慢)
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-red-900">🎬 Sync 設定影片</h3>
            <p className="text-sm text-red-800">
              建置中
              {/* 建議先看 1 次影片，照著做會更快完成設定。 */}
            </p>
            {false && (
              <a
                href={syncTutorialVideo.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                觀看 YouTube：{syncTutorialVideo.title}
              </a>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">
              步驟 1: 在 Supabase 建立帳號和資料庫
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>
                打開{" "}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Supabase
                </a>
              </li>
              <li>建議使用 GitHub 帳號登入，建立新的 Supabase 專案。</li>
            </ol>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-purple-900">
              步驟 2: 貼上SQL程式碼來初始化資料表
            </h3>
            <button
              onClick={handleCopySQLCode}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              📋 複製 SQL 程式碼
            </button>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>在 Supabase SQL Editor 中貼上剛才複製的程式碼</li>
              <li>執行 SQL 程式碼以初始化資料表</li>
              <li>在 Table Editor 確認資料表是否已正確建立</li>
            </ol>
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            下一步：輸入 Supabase URL 與 API 金鑰 →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              🔗 輸入您的 Supabase 專案的 URL 與 API 金鑰
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              請複製 Supabase 專案的 URL 與 API 金鑰，位於 Supabase → Project
              Overview → Framework → .env
            </p>
            <p className="text-gray-600 text-sm mb-4">
              直接複製即可，型態如下：
              <br />
              <pre>
                <code>
                  VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
                  VITE_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
                </code>
              </pre>
            </p>
          </div>
          <textarea
            value={syncStr}
            onChange={(e) => setSyncStr(e.target.value)}
            placeholder="It has two rows"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          ></textarea>
          <button
            onClick={() => {
              handleSaveAndTest();
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            ✅ 保存並測試連接
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {/*header*/}
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Supabase 每小時自動生成 ics 檔案(可選)
            </h2>
            <p className="text-gray-600">
              您將需要手動增加 storage bucket、給予Edge Function 好執行生成
              ics的動作，然後在Supabase排程每小時自動執行。
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">步驟１：新增 storage bucket</h3>
            <p>
              在 Supabase 控制台中，導航到 Storage，然後新增一個
              bucket，請名稱定為 <strong>ics-exports</strong>，用於存放生成的
              ics 檔案。
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">步驟２：給予 Edge Function 權限</h3>
            <p>
              在 Supabase 控制台中，導航到 Edge Functions，然後為生成 ics
              的函數配置適當的權限，以便它可以訪問剛剛創建的 storage bucket。
            </p>
            <p>
              請將此
              <a
                href="https://github.com/ychsue/NonBlockingLife/tree/main/pwa/src/db/supabase/icsExportCode.ts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Edge Function 內容
              </a>{" "}
              作為參考，配置相應的權限。
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">步驟３：設定排程</h3>
            <p>
              在 Supabase 控制台中，導航到SQL 編輯器，執行相應的{" "}
              <a
                href="https://github.com/ychsue/NonBlockingLife/tree/main/pwa/src/db/supabase/cronTask.sql"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                SQL 腳本
              </a>
              來設定每小時自動生成 ics 檔案的排程。
            </p>
          </div>
          <button
            onClick={() => setStep(4)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            下一步：完成 →
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-600">設置完成！</h2>
          <p className="text-gray-600">您現在可以開始使用Supabase 同步功能了</p>
          <button
            onClick={handleComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            完成
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600">您的輸入有誤！</h2>
          <p className="text-gray-600">
            您輸入的值有誤或其他原因導致無法完成設置。
          </p>
          <button
            onClick={handleComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            返回
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
            <h1 className="text-lg font-bold">Supabase 設置</h1>
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
