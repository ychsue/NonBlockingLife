import { useEffect, useMemo, useState } from "react";
import { sleep } from "../../utils/timeUtils";
import { getDeviceType } from "../../utils/shortcutUtils";
import { useTwaRpc } from "../../hooks/useTwaRpc";
import { useTWithMaps } from "../../i18n";

export function GuideNotification() {
  const [refreshAndroidWebViewInfo, setRefreshAndroidWebViewInfo] =
    useState(false);
  const deviceType = useMemo(() => getDeviceType(), []);
  const { sendRequest } = useTwaRpc();
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [androidNotificationGranted, setAndroidNotificationGranted] = useState<
    boolean | null
  >(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const tHere = useTWithMaps({
    "zh-TW": {
      "背景提醒（可選）": "背景提醒（可選）",
      "啟用後，當你切到其他視窗時，NBL 可在「開始工作 / 結束工作」時顯示系統通知。":
        "啟用後，當你切到其他視窗時，NBL 可在「開始工作 / 結束工作」時顯示系統通知。",
      重設通知權限: "重設通知權限",
      "正在確認 Android 通知權限狀態...": "正在確認 Android 通知權限狀態...",
      "已啟用通知權限。背景時可收到工作狀態提醒。":
        "已啟用通知權限。背景時可收到工作狀態提醒。",
      "尚未允許通知。點「重設通知權限」會開啟系統設定頁面，將 NonBlockingLife 的通知改為允許。":
        "尚未允許通知。點「重設通知權限」會開啟系統設定頁面，將 NonBlockingLife 的通知改為允許。",
      "此瀏覽器目前不支援 Web Notification。":
        "此瀏覽器目前不支援 Web Notification。",
      "請稍候...": "請稍候...",
      允許: "允許",
      停用: "停用",
      "已封鎖通知。若是 TWA/Android App 內部狀態，點「重新允許」會再請求一次；若瀏覽器仍拒絕，請到系統或瀏覽器設定將 Notifications 改為 Allow。":
        "已封鎖通知。若是 TWA/Android App 內部狀態，點「重新允許」會再請求一次；若瀏覽器仍拒絕，請到系統或瀏覽器設定將 Notifications 改為 Allow。",
      重新允許: "重新允許",
      "若你選擇允許，系統會請求通知權限；若已被封鎖，可在下方直接重試。":
        "若你選擇允許，系統會請求通知權限；若已被封鎖，可在下方直接重試。",
      已停用: "已停用",
    },
    en: {
      "背景提醒（可選）": "Background Notifications (Optional)",
      "啟用後，當你切到其他視窗時，NBL 可在「開始工作 / 結束工作」時顯示系統通知。":
        "When enabled, NBL can display system notifications when you switch to other windows during 'Start Work / End Work'.",
      重設通知權限: "Reset Notification Permission",
      "正在確認 Android 通知權限狀態...":
        "Checking Android notification permission status...",
      "已啟用通知權限。背景時可收到工作狀態提醒。":
        "Notification permission enabled. You will receive work status notifications in the background.",
      "尚未允許通知。點「重設通知權限」會開啟系統設定頁面，將 NonBlockingLife 的通知改為允許。":
        "Notification not yet allowed. Clicking 'Reset Notification Permission' will open the system settings page to allow notifications for NonBlockingLife.",
      "此瀏覽器目前不支援 Web Notification。":
        "This browser does not currently support Web Notification.",
      "請稍候...": "Please wait...",
      允許: "Allow",
      停用: "Disable",
      "已封鎖通知。若是 TWA/Android App 內部狀態，點「重新允許」會再請求一次；若瀏覽器仍拒絕，請到系統或瀏覽器設定將 Notifications 改為 Allow。":
        "Notifications blocked. If this is within the TWA/Android App, clicking 'Request Again' will prompt again; if the browser still refuses, please go to the system or browser settings to allow Notifications.",
      重新允許: "Request Again",
      "若你選擇允許，系統會請求通知權限；若已被封鎖，可在下方直接重試。":
        "If you choose to allow, the system will request notification permission; if it has been blocked, you can retry directly below.",
      已停用: "Disabled",
    },
    ja: {
      "背景提醒（可選）": "バックグラウンド通知（オプション）",
      "啟用後，當你切到其他視窗時，NBL 可在「開始工作 / 結束工作」時顯示系統通知。":
        "有効にすると、他のウィンドウに切り替えたときに、NBL が「作業開始 / 作業終了」の際にシステム通知を表示できます。",
      重設通知權限: "通知権限をリセット",
      "正在確認 Android 通知權限狀態...": "Android の通知権限の状態を確認中...",
      "已啟用通知權限。背景時可收到工作狀態提醒。":
        "通知権限が有効になりました。バックグラウンドでも作業状況の通知を受け取ることができます。",
      "尚未允許通知。點「重設通知權限」會開啟系統設定頁面，將 NonBlockingLife 的通知改為允許。":
        "通知はまだ許可されていません。「通知権限をリセット」をクリックすると、システム設定ページが開き、NonBlockingLife の通知が許可されます。",
      "此瀏覽器目前不支援 Web Notification。":
        "このブラウザは現在 Web Notification をサポートしていません。",
      "請稍候...": "しばらくお待ちください...",
      允許: "許可",
      停用: "無効",
      "已封鎖通知。若是 TWA/Android App 內部狀態，點「重新允許」會再請求一次；若瀏覽器仍拒絕，請到系統或瀏覽器設定將 Notifications 改為 Allow。":
        "通知がブロックされました。TWA/Android アプリ内の場合、「再度許可」をクリックすると再度リクエストされます。ブラウザがまだ拒否する場合は、システムまたはブラウザの設定で通知を許可してください。",
      重新允許: "再度許可",
      "若你選擇允許，系統會請求通知權限；若已被封鎖，可在下方直接重試。":
        "許可を選択すると、システムは通知権限をリクエストします。既にブロックされている場合は、下のボタンで直接再試行できます。",
      已停用: "無効",
    },
  });

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV && !["TWA", "AndroidWebView"].includes(deviceType))
      return;

    // 改用 sendRequest 來取代 twaPort.postMessage
    sleep(10)
      .then(() => sendRequest("nbl:query-notification-permission", {}))
      .then((response: any) => {
        if (response?.type === "nbl:notification-permission-status") {
          console.log("Notification permission status response:", response);
          setAndroidNotificationGranted(Boolean(response.granted));
        }
      });
    setRefreshAndroidWebViewInfo(false);
  }, [deviceType, sendRequest, refreshAndroidWebViewInfo]);

  const handleOpenAndroidNotificationSettings = () => {
    // Chrome (foreground) must issue this navigation itself so Android treats the resulting
    // Activity start as user-initiated; a postMessage from our background process gets blocked.
    window.location.href = "nonblockinglife://notification-settings";
    sleep(100).then(() => setRefreshAndroidWebViewInfo(true));
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }

    setRequestingPermission(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleSetNotificationPermission = async (
    next: "granted" | "denied",
  ) => {
    if (next === "granted") {
      await handleRequestNotificationPermission();
      return;
    }

    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission("denied");
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        🔔 {tHere("背景提醒（可選）")}
      </h3>
      <p className="text-sm text-gray-700 leading-relaxed">
        {tHere(
          "啟用後，當你切到其他視窗時，NBL 可在「開始工作 / 結束工作」時顯示系統通知。",
        )}
      </p>

      <div className="mt-3">
        {["TWA", "AndroidWebView"].includes(deviceType) ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleOpenAndroidNotificationSettings}
              className="rounded-full bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
            >
              {tHere("重設通知權限")}
            </button>
            <p className="text-sm text-gray-600">
              {androidNotificationGranted === null
                ? tHere("正在確認 Android 通知權限狀態...")
                : androidNotificationGranted
                  ? tHere("已啟用通知權限。背景時可收到工作狀態提醒。")
                  : tHere(
                      "尚未允許通知。點「重設通知權限」會開啟系統設定頁面，將 NonBlockingLife 的通知改為允許。",
                    )}
            </p>
          </div>
        ) : (
          <>
            {notificationPermission === "unsupported" && (
              <p className="text-sm text-amber-700">
                {tHere("此瀏覽器目前不支援 Web Notification。")}
              </p>
            )}

            {(notificationPermission === "granted" ||
              notificationPermission === "default") && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      void handleSetNotificationPermission("granted")
                    }
                    disabled={
                      requestingPermission ||
                      notificationPermission === "granted"
                    }
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      notificationPermission === "granted"
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-sky-700 hover:bg-sky-100"
                    }`}
                  >
                    {requestingPermission ? tHere("請稍候...") : tHere("允許")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleSetNotificationPermission("denied")
                    }
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${"text-slate-700 hover:bg-slate-100"}`}
                  >
                    {tHere("停用")}
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  {notificationPermission === "granted"
                    ? tHere("已啟用通知權限。背景時可收到工作狀態提醒。")
                    : tHere(
                        "若你選擇允許，系統會請求通知權限；若已被封鎖，可在下方直接重試。",
                      )}
                </p>
              </div>
            )}

            {notificationPermission === "denied" && (
              <div className="space-y-3">
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      void handleSetNotificationPermission("granted")
                    }
                    disabled={requestingPermission}
                    className="rounded-full bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {requestingPermission
                      ? tHere("請稍候...")
                      : tHere("重新允許")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleSetNotificationPermission("denied")
                    }
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {tHere("已停用")}
                  </button>
                </div>

                <p className="text-sm text-amber-700">
                  {tHere(
                    "已封鎖通知。若是 TWA/Android App 內部狀態，點「重新允許」會再請求一次；若瀏覽器仍拒絕，請到系統或瀏覽器設定將 Notifications 改為 Allow。",
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
