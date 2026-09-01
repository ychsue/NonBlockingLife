import { useAppStore } from "../store/appStore";
import { getDeviceType } from "./shortcutUtils";

/**
 *
 * @param title 標題
 * @param body 內文
 * @param options dismissOnClick 是否點擊後關閉通知, url 點擊通知後要導向的網址, id 通知的唯一識別碼，
 * id : 1: 任務狀態切換(開始&結束)通知
 * @returns void
 */
export const notify = (
  title: string,
  body: string,
  options?: { dismissOnClick?: boolean; url?: string; id?: number },
) => {
  const dismissOnClick = options?.dismissOnClick ?? true;
  const twaPort = (
    window as unknown as {
      __NBL_TWA_BRIDGE__?: { port: MessagePort | null };
    }
  ).__NBL_TWA_BRIDGE__?.port;
  const locale = useAppStore.getState().locale;

  // Inside the TWA, let the Android app show a native notification instead of the
  // web Notification API, since it has its own icon/channel and doesn't need permission.
  if (twaPort) {
    useAppStore.getState().setNeedToCheckTwaChannelDebounced(true); // 因為要發送通知給 TWA，所以需要檢查 TWA channel 是否正常
    twaPort.postMessage(
      JSON.stringify({
        type: "nbl:notify",
        title,
        body,
        id: options?.id ?? Date.now() & 0x7fffffff,
        url: options?.url ?? window.location.href,
        dismissOnClick,
      }),
    );
    return;
  }

  const deviceType = getDeviceType();
  if (deviceType === "TWA") {
    alert(
      locale == "zh-TW"
        ? `[TWA] 看到這個訊息，表示APP內通路可能出問題，請關閉所有背景中的此APP，然後再重啟這個APP。謝謝。`
        : locale == "ja"
          ? `[TWA] このメッセージが表示された場合、アプリ内の通知経路に問題がある可能性があります。すべてのバックグラウンドでこのアプリを閉じてから、再起動してください。ありがとうございます。`
          : `[TWA] If you see this message, it means that there may be a problem with the notification path in the app. Please close all background instances of this app and then restart this app. Thank you.`,
    );
  } else if (deviceType === "Android") {
    alert(
      locale == "zh-TW"
        ? `[Android] 若您正參與Play商店的封閉測試卻看到這訊息，那表示APP內通路可能出問題，請重啟這個APP。若不是，等通過封閉測試後，安裝此APP就可以主動提醒您。`
        : locale == "ja"
          ? `[Android] Playストアのクローズドテストに参加している場合にこのメッセージが表示された場合、アプリ内の通知経路に問題がある可能性があります。アプリを再起動してください。そうでない場合は、クローズドテストを通過した後、このアプリをインストールすると、通知が届くようになります。`
          : `[Android] If you are participating in the Play Store closed test and see this message, it means that there may be a problem with the notification path in the app. Please restart this app. If not, after passing the closed test, installing this app will allow you to receive notifications.`,
    );
  }

  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const notificationOptions: NotificationOptions & {
    data?: { url: string; dismissOnClick: boolean };
  } = {
    body,
    tag: "nbl-running-task",
    data: {
      url: options?.url ?? window.location.href,
      dismissOnClick,
    },
  };

  const showViaServiceWorker = () => {
    if (!navigator.serviceWorker) {
      return;
    }

    void navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, notificationOptions);
      })
      .catch((err) =>
        console.warn("Failed to show notification via service worker:", err),
      );
  };

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      showViaServiceWorker();
      return;
    }

    const notification = new Notification(title, notificationOptions);
    notification.onclick = () => {
      if (dismissOnClick) {
        notification.close();
      }
      window.focus();
      window.location.assign(
        notificationOptions.data?.url ?? window.location.href,
      );
    };
  } catch (e) {
    console.warn("Unable to show notification:", e);
    showViaServiceWorker();
  }
};

export const notifies = {
  taskStarted: (taskTitle: string, locale: string) => {
    notify(
      locale === "zh-TW"
        ? "工作進行中"
        : locale === "ja"
          ? "作業中"
          : "Work session running",
      locale === "zh-TW"
        ? `${taskTitle} 已開始，保持專注。`
        : locale === "ja"
          ? `${taskTitle} を開始しました。`
          : `${taskTitle} has started. Stay focused.`,
      { dismissOnClick: false, id: 1 },
    );
  },
  taskEnded: (previousTaskTitle: string, locale: string) => {
    notify(
      locale === "zh-TW"
        ? "工作已結束"
        : locale === "ja"
          ? "作業が終了しました"
          : "Work session ended",
      locale === "zh-TW"
        ? `${previousTaskTitle} 已離開工作中狀態。`
        : locale === "ja"
          ? `${previousTaskTitle} は作業中ステータスを終了しました。`
          : `${previousTaskTitle} is no longer in running mode.`,
      { dismissOnClick: true, id: 1 },
    );
  },
  taskInterruptNotify: (title: string, body: string) => {
    notify(title, body, { dismissOnClick: true, id: 1 });
  },
};
