import { useTWithKeyLocaleMaps } from "../../i18n";
import { HelloShellKind } from "../../native/NativeBridge";
import { ExternalA } from "../ExternalA";
import androidSVG from "./android.svg";
import windowsSVG from "./windows11.svg";

interface RuntimeWebDialogProps {
  type?: HelloShellKind;
  className?: string;
  show?: boolean; // 外面告知顯示或隱藏
  onClose?: () => void; // 告知外面此 tsx 想關閉
}

/**
 * 告知人們可以安裝 Native App，
 */

export function RuntimeWebDialog({
  type,
  className,
  onClose,
  show,
}: RuntimeWebDialogProps) {
  const t = useTWithKeyLocaleMaps({
    updateYourNonBlockingLife: {
      "en": "Update your NonBlockingLife",
      "zh-TW": "升級您的 NonBlockingLife",
      "ja": "NonBlockingLife をアップデート"
    },
    title: {
      "zh-TW": `目前您正在使用 ${type ?? "Web/PWA"} 版 NonBlockingLife。`,
      "en": `You are currently using the ${type ?? "Web/PWA"} version of NonBlockingLife.`,
      "ja": `現在、${type ?? "Web/PWA"} 版 NonBlockingLife を使用しています。`
    },
    title_suggestion: {
      "zh-TW": `目前您正在使用 ${type ?? "Web/PWA"} 版 NonBlockingLife。建議升級至 Native App。`,
      "en": `You are currently using the ${type ?? "Web/PWA"} version of NonBlockingLife. It is recommended to upgrade to the Native App.`,
      "ja": `現在、${type ?? "Web/PWA"} 版 NonBlockingLife を使用しています。Native App へのアップグレードをお勧めします。`
    },
    suggestion: {
      "zh-TW": "建議：",
      "en": "Suggestion:",
      "ja": "提案："
    },
    installNativeApp: {
      "zh-TW": "安裝 Android, Windows, Linux App",
      "en": "Install Android, Windows, Linux App",
      "ja": "Android, Windows, Linux App をインストール"
    },
    appleSeries: {
      "zh-TW": "Apple 系列",
      "en": "Apple Series",
      "ja": "Apple シリーズ"
    },
    afterInstallYouWillGet: {
      "zh-TW": "安裝後您將獲得：",
      "en": "After installation, you will get:",
      "ja": "インストール後に得られるもの："
    },
    timer: {
      "zh-TW": "原生計時器",
      "en": "Native Timer",
      "ja": "ネイティブタイマー"
    },
    backgroundNotification: {
      "zh-TW": "更好的背景通知",
      "en": "Better Background Notifications",
      "ja": "より良いバックグラウンド通知"
    },
    systemIntegration: {
      "zh-TW": "系統整合",
      "en": "System Integration",
      "ja": "システム統合"
    },
    shareToInbox: {
      "zh-TW": "分享至 Inbox (Android)",
      "en": "Share to Inbox (Android)",
      "ja": "Inbox に共有 (Android)"
    },
    appleSeriesNotAvailable: {
      "zh-TW": "抱歉，Apple 系列尚未提供 Native App。",
      "en": "Sorry, the Apple Series does not have a Native App available yet.",
      "ja": "申し訳ありませんが、Apple シリーズにはまだネイティブアプリが提供されていません。"
    },
    toGuidePage: {
      "zh-TW": "前往指南頁面",
      "en": "Go to Guide Page",
      "ja": "ガイドページへ"
    },
    appleNotAvailableDescription: {
      "zh-TW": "有此頁面，您可以看到iPhone Shortcuts 可以安裝，搭配這些捷徑，可以實現原生系統才有的功能，比如計時。",
      "en": "On this page, you can see that iPhone Shortcuts can be installed. With these shortcuts, you can achieve features that are only available on the native system, such as timers.",
      "ja": "このページでは、iPhone ショートカットをインストールできることがわかります。これらのショートカットを使用すると、タイマーなど、ネイティブシステムでのみ利用可能な機能を実現できます。"
    },
    appleDescription2: {
      "zh-TW": "此外，這些捷徑裏頭若以 wepApp:// 開頭的，表示是指定開啟 PWA，您可以改回 https:// 好使用瀏覽器開啟。",
      "en": "In addition, if these shortcuts start with wepApp://, it means they are set to open the PWA. You can change it back to https:// to use the browser.",
      "ja": "さらに、これらのショートカットが wepApp:// で始まる場合、それは PWA を開くように指定されていることを意味します。ブラウザを使用するには、https:// に戻すことができます。"
    },
    comment: {
      "zh-TW": "留言",
      "en": "Comment",
      "ja": "コメント"
    },
    commentDescription: {
      "zh-TW": "請到 GitHub上留下您的意見或建議。",
      "en": "Please leave your comments or suggestions on GitHub.",
      "ja": "ご意見やご提案をお寄せください GitHub でお願いします。"
    }
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
          <h2 className="text-lg font-semibold">🚀 {t("updateYourNonBlockingLife")}</h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <h3 className="mb-3 font-semibold">{t("title")}</h3>
        <p>
          {t("title_suggestion")}
        </p>
        <h3 className="mb-3 font-semibold">{t("suggestion")}</h3>
        <p>{t("installNativeApp")}</p>
        <p>{t("afterInstallYouWillGet")}</p>
        <div className="bg-slate-50 rounded-lg p-3 my-3">
          <div>✅ {t("timer")}</div>
          <div>✅ {t("backgroundNotification")}</div>
          <div>✅ {t("systemIntegration")}</div>
          <div>✅ {t("shareToInbox")}</div>
        </div>
        <ExternalA
          href="https://play.google.com/store/apps/details?id=com.yescirculation.nonblockinglife"
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-slate-50 transition-color  "
        >
          <img src={androidSVG} alt="Android" className="w-4 h-4" />
          Android
        </ExternalA>
        <ExternalA
          href="https://www.microsoft.com/store/apps/9P69CC1TTSWC"
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-slate-50 transition-color  "
        >
          <img src={windowsSVG} alt="Windows" className="w-4 h-4" />
          Windows
        </ExternalA>
        {/* 先disable linux的部分，因為還沒通過 */}
        <ExternalA
          href="#"
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-slate-50 transition-color  "
          disabled
        >
          🐧Linux (TODO)
        </ExternalA>
        <h3 className="mb-3 font-semibold">{t("appleSeries")}</h3>
        <p>{t("appleSeriesNotAvailable")}
          <ExternalA
            href="?action=navigate&sheet=guide"
            className="flex items-center gap-2 p-3 rounded-lg border hover:bg-slate-50 transition-color"
          >
            {t("toGuidePage")}
          </ExternalA>
          {t("appleNotAvailableDescription")}
          <div>
            {t("appleDescription2")}
          </div>
        </p>
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
