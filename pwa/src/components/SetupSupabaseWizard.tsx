// pwa/src/components/SetupWizard.tsx

import { useState } from "react";
import supabaseCode from "../db/supabase/initialize.sql?raw";
import { useT, useTWithMaps } from "../i18n";
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
  const tHere = useTWithMaps({
    "zh-TW": {
      "supabaseSetup": "Supabase 設置",
      "解說：NBL Supabase Sync 設定教學":
        "中文解說：NBL Supabase Sync 設定教學",
      "step1.header": "首次與更新同步設置",
      "step1.description":
        "4 步完成設置，您的數據將存儲在您自己的 Supabase 資料庫中",
      "step1.switchToGAS": "改用 GAS 同步(較慢)",
      "step1.syncTutorialVideo.title": "Sync 設定影片",
      "step1.syncTutorialVideo.watchOnYouTube": "觀看 YouTube",
      "step1.1.createAccountAndDatabase":
        "步驟 1: 在 Supabase 建立帳號和資料庫",
      "step1.1.createAccountAndDatabase.instruction":
        "建議使用 GitHub 帳號登入，建立新的 Supabase 專案。",
      "step1.2.pasteSQLCode": "步驟 2: 貼上SQL程式碼來初始化資料表",
      打開: "打開",
      "step1.2.pasteSQLCode.instruction":
        "將 SQL 程式碼貼到您的 Supabase 專案中以初始化資料庫。",
      "step1.2.pasteSQLCode.1": "在 Supabase SQL Editor 中貼上剛才複製的程式碼",
      "step1.2.pasteSQLCode.2": "執行 SQL 程式碼以初始化資料表",
      "step1.2.pasteSQLCode.3": "在 Table Editor 確認資料表是否已正確建立",
      "step1.nextStep": "下一步：輸入 Supabase URL 與 API 金鑰 →",
      "step2.enterSupabaseURLAndAPIKey":
        "輸入您的 Supabase 專案的 URL 與 API 金鑰",
      "step2.enterSupabaseURLAndAPIKey.instruction":
        "請複製 Supabase 專案的 URL 與 API 金鑰，位於 Supabase → Project Overview → Framework → .env",
      "step2.enterSupabaseURLAndAPIKey.example": "直接複製即可，型態如下：",
      "step2.saveAndTest": "保存並測試連接",
      "step2.enterSupabaseURLAndAPIKey.placeholder": "直接複製的值有兩列",
      "step3.header": "Supabase 每小時自動生成 ics 檔案(可選)",
      "step3.instruction":
        "您將需要手動增加 storage bucket、給予Edge Function 好執行生成 ics的動作，然後在Supabase排程每小時自動執行。",
      "step3.1.header": "步驟 1: 新增 storage bucket",
      "step3.2.header": "步驟 2: 給予 Edge Function 權限生成 ics 檔案",
      "step3.3.header": "步驟 3: 在 Supabase 排程每小時自動執行",
      "step3.2.instruction":
        "在 Supabase 控制台中，導航到 Edge Functions，然後為生成 ics 的函數配置適當的權限，以便它可以訪問剛剛創建的 storage bucket。",
      "step3.nextStep": "下一步：完成 →",
      "step4.header": "設置完成！",
      "step4.instruction": "您現在可以開始使用Supabase 同步功能了",
      "step4.complete": "完成",
      "step5.header": "您的輸入有誤！",
      "step5.instruction": "您輸入的值有誤或其他原因導致無法完成設置。",
      "step5.back": "返回",
    },
    en: {
      "supabaseSetup": "Supabase Setup",
      "解說：NBL Supabase Sync 設定教學":
        "English Walkthrough: NBL Supabase Sync Setup (You need to turn on Subtitles)",
      "step1.header": "Initial and Update Sync Setup",
      "step1.description":
        "Complete the setup in 4 steps, and your data will be stored in your own Supabase database.",
      "step1.switchToGAS": "Switch to GAS Sync (slower)",
      "step1.syncTutorialVideo.title": "Sync Tutorial Video",
      "step1.syncTutorialVideo.watchOnYouTube": "Watch on YouTube",
      "step1.1.createAccountAndDatabase":
        "Step 1: Create an account and database on Supabase",
      "step1.1.createAccountAndDatabase.instruction":
        "It is recommended to log in with a GitHub account and create a new Supabase project.",
      "step1.2.pasteSQLCode":
        "Step 2: Paste SQL code to initialize the database",
      打開: "Open",
      "step1.2.pasteSQLCode.instruction":
        "Paste the SQL code into your Supabase project to initialize the database.",
      "step1.2.pasteSQLCode.1":
        "Paste the copied code into the Supabase SQL Editor",
      "step1.2.pasteSQLCode.2": "Execute the SQL code to initialize the tables",
      "step1.2.pasteSQLCode.3":
        "Check in the Table Editor to confirm that the tables have been correctly created",
      "step1.nextStep": "Next step: Enter Supabase URL and API key →",
      "step2.enterSupabaseURLAndAPIKey":
        "Enter your Supabase project's URL and API key",
      "step2.enterSupabaseURLAndAPIKey.instruction":
        "Copy the URL and API key of your Supabase project, located at Supabase → Project Overview → Framework → .env",
      "step2.enterSupabaseURLAndAPIKey.example":
        "Just copy it directly, the format is as follows:",
      "step2.saveAndTest": "Save and test the connection",
      "step2.enterSupabaseURLAndAPIKey.placeholder": "It has two rows",
      "step3.header":
        "Supabase automatically generates ics files every hour (optional)",
      "step3.instruction":
        "You will need to manually add a storage bucket, grant the Edge Function permission to generate ics files, and then schedule Supabase to run it every hour.",
      "step3.1.header": "Step 1: Add a storage bucket",
      "step3.2.header":
        "Step 2: Grant the Edge Function permission to generate ics files",
      "step3.3.header": "Step 3: Schedule Supabase to run it every hour",
      "step3.2.instruction":
        "In the Supabase console, navigate to Edge Functions and configure the appropriate permissions for the function that generates ics files, so that it can access the storage bucket you just created.",
      "step3.nextStep": "Next step: Complete →",
      "step4.header": "Setup Complete!",
      "step4.instruction": "You can now start using the Supabase sync feature.",
      "step4.complete": "Complete",
      "step5.header": "There was an error with your input!",
      "step5.instruction": "The value you entered is incorrect or for other reasons the setup could not be completed.",
      "step5.back": "Back",
    },
    ja: {
      "supabaseSetup": "Supabase 設置",
      "解說：NBL Supabase Sync 設定教學":
        "華語の解説：NBL Supabase Sync 設定ガイド(字幕をオンにする必要があります)",
      "step1.header": "初回および更新の同期設定",
      "step1.description":
        "4 ステップで設定を完了すると、データは自分の Supabase データベースに保存されます。",
      "step1.switchToGAS": "GAS 同期に切り替える（遅い）",
      "step1.syncTutorialVideo.title": "Sync 設定影片",
      "step1.syncTutorialVideo.watchOnYouTube": "YouTube で視聴",
      "step1.1.createAccountAndDatabase":
        "ステップ 1: Supabase でアカウントとデータベースを作成",
      "step1.1.createAccountAndDatabase.instruction":
        "Supabase でアカウントにログインし、新しいプロジェクトを作成することをお勧めします。",
      "step1.2.pasteSQLCode":
        "ステップ 2: SQL コードを貼り付けてデータベースを初期化",
      打開: "開く",
      "step1.2.pasteSQLCode.instruction":
        "SQL コードを貼り付けてデータベースを初期化します。",
      "step1.2.pasteSQLCode.1":
        "Supabase SQL Editor にコピーしたコードを貼り付けます",
      "step1.2.pasteSQLCode.2": "SQL コードを実行してテーブルを初期化します",
      "step1.2.pasteSQLCode.3":
        "Table Editor でテーブルが正しく作成されたことを確認します",
      "step1.nextStep": "次のステップ: Supabase URL と API キーを入力 →",
      "step2.enterSupabaseURLAndAPIKey":
        "Supabase プロジェクトの URL と API キーを入力してください",
      "step2.enterSupabaseURLAndAPIKey.instruction":
        "Supabase プロジェクトの URL と API キーをコピーしてください。場所は Supabase → Project Overview → Framework → .env です",
      "step2.enterSupabaseURLAndAPIKey.example":
        "直接コピーしてください。形式は以下の通りです：",
      "step2.saveAndTest": "接続を保存してテスト",
      "step2.enterSupabaseURLAndAPIKey.placeholder": "2 行あります",
      "step3.header":
        "Supabase は毎時自動的に ics ファイルを生成します（任意）",
      "step3.instruction":
        "ストレージバケットを手動で追加し、Edge Function に ics ファイルを生成する権限を付与し、その後 Supabase で毎時実行するようにスケジュールする必要があります。",
      "step3.1.header": "ステップ 1: ストレージバケットを追加",
      "step3.2.header":
        "ステップ 2: Edge Function に ics ファイルを生成する権限を付与",
      "step3.3.header": "ステップ 3: Supabase で毎時実行するようにスケジュール",
      "step3.2.instruction":
        "Supabase コンソールで、Edge Functions に移動し、ICS を生成する関数に適切な権限を設定して、先ほど作成したストレージバケットにアクセスできるようにしてください。",
      "step3.nextStep": "次のステップ: 完了 →",
      "step4.header": "設置完了！",
      "step4.instruction": "これで Supabase 同期の設定が完了しました。",
      "step4.complete": "完成",
      "step5.header": "入力に誤りがあります！",
      "step5.instruction": "入力した値が正しくないか、その他の理由で設定を完了できませんでした。",
      "step5.back": "戻る"
    },
  });

  const syncTutorialVideo = {
    title: tHere("解說：NBL Supabase Sync 設定教學"),
    url: "https://youtu.be/8ci6us7lMuw",
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

  const Step3_1_Instruction = () =>
    locale == "zh-TW" ? (
      <p>
        在 Supabase 控制台中，導航到 Storage，然後新增一個 bucket，請名稱定為{" "}
        <strong>ics-exports</strong>，用於存放生成的 ics 檔案。
      </p>
    ) : locale == "ja" ? (
      <p>
        Supabase コンソールで、Storage
        に移動し、新しいバケットを追加します。名前は{" "}
        <strong>ics-exports</strong> とし、生成された ics ファイルを保存します。
      </p>
    ) : (
      <p>
        In the Supabase console, navigate to Storage and add a new bucket named{" "}
        <strong>ics-exports</strong> to store the generated ics files.
      </p>
    );

  const Step3_2_Hyperlink = () =>
    locale == "zh-TW" ? (
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
    ) : locale === "ja" ? (
      <p>
        こちらの
        <a
          href="https://github.com/ychsue/NonBlockingLife/tree/main/pwa/src/db/supabase/icsExportCode.ts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Edge Function の内容
        </a>{" "}
        を参考に、適切な権限を設定してください。
      </p>
    ) : (
      <p>
        Please refer to this{" "}
        <a
          href="https://github.com/ychsue/NonBlockingLife/tree/main/pwa/src/db/supabase/icsExportCode.ts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Edge Function content
        </a>{" "}
        and configure the appropriate permissions.
      </p>
    );

  const Step3_3_Instruction = () =>
    locale == "zh-TW" ? (
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
    ) : locale == "ja" ? (
      <p>
        Supabase コンソールで、SQL エディタに移動し、対応する{" "}
        <a
          href="https://github.com/ychsue/NonBlockingLife/tree/main/pwa/src/db/supabase/cronTask.sql"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          SQL スクリプト
        </a>
        を実行して、毎時自動的に ics
        ファイルを生成するスケジュールを設定します。
      </p>
    ) : (
      <p>
        In the Supabase console, navigate to the SQL editor and execute the
        corresponding{" "}
        <a
          href="https://github.com/ychsue/NonBlockingLife/tree/main/pwa/src/db/supabase/cronTask.sql"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          SQL script
        </a>
        to set up a schedule for automatically generating ics files every hour.
      </p>
    );
  const content = (
    <div className="space-y-6">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              🚀 {tHere("step1.header")}
            </h2>
            <p className="text-gray-600">{tHere("step1.description")}</p>
            <button
              onClick={() => setSyncType("gas")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              {tHere("step1.switchToGAS")}
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-red-900">
              🎬 {tHere("step1.syncTutorialVideo.title")}
            </h3>
            {true && (
              <a
                href={syncTutorialVideo.url}
                data-tour="supabase-youtube-tutorial"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {tHere("step1.syncTutorialVideo.watchOnYouTube")}:{" "}
                {syncTutorialVideo.title}
              </a>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">
              {tHere("step1.1.createAccountAndDatabase")}
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>
                {tHere("打開")}{" "}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Supabase
                </a>
              </li>
              <li>{tHere("step1.1.createAccountAndDatabase.instruction")}</li>
            </ol>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-purple-900">
              {tHere("step1.2.pasteSQLCode")}
            </h3>
            <button
              onClick={handleCopySQLCode}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              📋 {tHere("step1.2.pasteSQLCode")}
            </button>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>{tHere("step1.2.pasteSQLCode.1")}</li>
              <li>{tHere("step1.2.pasteSQLCode.2")}</li>
              <li>{tHere("step1.2.pasteSQLCode.3")}</li>
            </ol>
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            {tHere("step1.nextStep")}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              🔗 {tHere("step2.enterSupabaseURLAndAPIKey")}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {tHere("step2.enterSupabaseURLAndAPIKey.instruction")}
            </p>
            <p className="text-gray-600 text-sm mb-4">
              {tHere("step2.enterSupabaseURLAndAPIKey.example")}
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
            placeholder={tHere("step2.enterSupabaseURLAndAPIKey.placeholder")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          ></textarea>
          <button
            onClick={() => {
              handleSaveAndTest();
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            ✅ {tHere("step2.saveAndTest")}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {/*header*/}
          <div>
            <h2 className="text-2xl font-bold mb-2">{tHere("step3.header")}</h2>
            <p className="text-gray-600">{tHere("step3.instruction")}</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">
              {tHere("step3.1.header")}
            </h3>
            <Step3_1_Instruction />
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">
              {tHere("step3.2.header")}
            </h3>
            <p>{tHere("step3.2.instruction")}</p>
            <Step3_2_Hyperlink />
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">
              {tHere("step3.3.header")}
            </h3>
            <Step3_3_Instruction />
          </div>
          <button
            onClick={() => setStep(4)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            {tHere("step3.nextStep")}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-600">{tHere("step4.header")}</h2>
          <p className="text-gray-600">{tHere("step4.instruction")}</p>
          <button
            onClick={handleComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            {tHere("step4.complete")}
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600">{tHere("step5.header")}</h2>
          <p className="text-gray-600">
            {tHere("step5.instruction")}
          </p>
          <button
            onClick={handleComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            {tHere("step5.back")}
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
            <h1 className="text-lg font-bold">{tHere("supabaseSetup")}</h1>
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
