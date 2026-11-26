import { useTWithKeyLocaleMaps } from "../../i18n";
import { useState, useEffect } from "react";
import { HelloShellKind } from "../../native/NativeBridge";
import { ExternalA } from "../ExternalA";
import { useNativeBridge } from "../../native/useNativeBridge";

interface RuntimeNativeDialogProps {
  type?: HelloShellKind;
  className?: string;
  show?: boolean; // 外面告知顯示或隱藏
  onClose?: () => void; // 告知外面此 tsx 想關閉
}

/**
 * 告知人們可以安裝 Native App，
 */

export function RuntimeNativeDialog({
  type,
  className,
  onClose,
  show,
}: RuntimeNativeDialogProps) {
  const [version, setVersion] = useState<string | undefined>(undefined);
  const bridge = useNativeBridge();

  useEffect(() => {
    // 假設有一個方法可以獲取原生端版本
    const fetchVersion = async () => {
      const response = await bridge.request("nbl:version", {});
      if (response?.version) setVersion(response.version);
    };
    fetchVersion();
  }, []);

  const t = useTWithKeyLocaleMaps({
    congratulations: {
      "zh-TW": "恭喜，您已經是使用原生App了",
      en: "Congratulations, you are now using the native app",
      ja: "おめでとうございます。あなたはすでにネイティブアプリを使用しています",
    },
    title_suggestion: {
      "zh-TW":
        "您的原生端版本為 {version}。這樣，您就可以使用原生功能，比如計時器、鬧鐘、通知等",
      en: "The version of your native app is {version}. This way, you can use native features like timer, alarm, notifications, etc.",
      ja: "ネイティブアプリのバージョンは {version} です。これにより、タイマー、アラーム、通知などのネイティブ機能を使用できます",
    },
    comment: {
      "zh-TW": "留言",
      en: "Comment",
      ja: "コメント",
    },
    commentDescription: {
      "zh-TW": "請到 GitHub上留下您的意見或建議。",
      en: "Please leave your comments or suggestions on GitHub.",
      ja: "ご意見やご提案をお寄せください GitHub でお願いします。",
    },
  });
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/50 pointer-events-auto safe-padding-bottom ${className}`}
      style={{ display: show ? "flex" : "none" }}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-lg sm:rounded-lg p-2.5 shadow-lg max-h-[90vh] sm:max-h-[80vh] flex flex-col overflow-y-auto overflow-x-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">🎉 {t("congratulations")}</h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <p>{t("title_suggestion",{ version: version ?? "" })}</p>
        <h3 className="mb-3 font-semibold">{t("comment")}</h3>
        <p>{t("commentDescription")}</p>
        <ExternalA
          href="https://github.com/ychsue/NonBlockingLife/issues"
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-slate-50 transition-color"
        >
          GitHub
        </ExternalA>
      </div>
    </div>
  );
}
