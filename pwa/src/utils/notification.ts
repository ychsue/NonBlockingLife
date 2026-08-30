import {useAppStore} from '../store/appStore'

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
    const twaPort = (window as unknown as {
        __NBL_TWA_BRIDGE__?: { port: MessagePort | null };
    }).__NBL_TWA_BRIDGE__?.port;

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
            window.location.assign(notificationOptions.data?.url ?? window.location.href);
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

}