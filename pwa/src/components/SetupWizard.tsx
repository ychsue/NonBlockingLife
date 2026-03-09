// pwa/src/components/SetupWizard.tsx

import { useState } from "react";
import gasCode from "../gas/程式碼.js?raw";

interface SetupWizardProps {
  isModal?: boolean;
  onComplete?: (url: string) => void;
  onClose?: () => void;
}

export function SetupWizard({ isModal = false, onComplete, onClose }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [gasUrl, setGasUrl] = useState('');
  
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
    if (!gasUrl || !gasUrl.includes('script.google.com')) {
      alert('❌ 請輸入有效的 GAS Web App URL');
      return;
    }

    // 測試連接
    try {
      const response = await fetch(gasUrl + '?action=ping');
      const data = await response.json();
      
      if (data.status === 'ok') {
        // 保存到 localStorage
        localStorage.setItem('gasWebAppUrl', gasUrl);
        // 如果是 modal，直接調用 onComplete；否則進到第 3 步
        if (isModal) {
          handleComplete();
        } else {
          setStep(3);
        }
      }
    } catch (e) {
      alert('❌ 連接失敗，請檢查 URL 是否正確');
    }
  };

  const content = (
    <div className="space-y-6">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">🚀 首次同步設置</h2>
            <p className="text-gray-600">4 步完成設置，您的數據將存儲在您自己的 Google Drive</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-blue-900">步驟 1: 建立 Google Sheet</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>打開 <a href="https://sheets.google.com" target="_blank" className="text-blue-600 hover:underline">Google Sheets</a></li>
              <li>建立新試算表，命名為 <strong>NonBlockingLife Data</strong></li>
              <li>可選：放入您自己的資料夾（例如 NBL）</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-green-900">步驟 2: 從 Sheet 開啟 Apps Script（綁定模式）</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>在剛建立的 Sheet 中點選「擴充功能」→「Apps Script」</li>
              <li>這會建立 bound script，可直接使用 <code className="bg-white px-1 py-0.5 rounded text-xs">getActiveSpreadsheet()</code></li>
              <li>不需要手動填 SPREADSHEET_ID</li>
            </ol>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-purple-900">步驟 3: 貼上同步程式碼</h3>
            <button 
              onClick={() => copyGASCode()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              📋 複製 Apps Script 代碼
            </button>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>在 Apps Script 編輯器中貼上剛才複製的代碼</li>
              <li>儲存（Ctrl+S）</li>
            </ol>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-amber-900">步驟 4: 部署為 Web 應用程式</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>點擊「部署」→「新部署」</li>
              <li>選擇「Web 應用程式」</li>
              <li>執行身份：<strong>「我」</strong></li>
              <li>誰可以訪問：<strong>「任何人」</strong></li>
              <li>點擊「部署」</li>
              <li>複製「Web 應用程式 URL」（結尾通常是 <code className="bg-white px-1 py-0.5 rounded text-xs">/exec</code>）</li>
            </ol>
            <button 
              onClick={() => setStep(2)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              下一步：輸入 URL →
            </button>
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">🔗 輸入您的 Web App URL</h2>
            <p className="text-gray-600 text-sm mb-4">請貼上從 Google Apps Script 部署後取得的 URL</p>
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
            ✅ 保存並測試連接
          </button>
        </div>
      )}
      
      {step === 3 && !isModal && (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600">設置完成！</h2>
          <p className="text-gray-600">您現在可以開始使用同步功能了</p>
          <button 
            onClick={handleComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            完成
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
            <h1 className="text-lg font-bold">Google Apps Script 設置</h1>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            )}
          </div>
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}

function copyGASCode() {
  navigator.clipboard.writeText(gasCode);
  alert('✅ 完整的 Apps Script 代碼已複製到剪貼板！現在請到 Google Sheets 中打開 Apps Script 編輯器並貼上。');
}
