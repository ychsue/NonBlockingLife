import { useEffect, useRef } from "react";

type TwaBridge = {
  port: MessagePort | null;
  connected: boolean;
  lastMessage: any;
  setPort: (port: MessagePort | null) => void;
  subscribe: (
    fn: (data: any, ev: MessageEvent) => void,
    options?: { replay?: boolean },
  ) => () => void;
  postMessage: (msg: string) => boolean;
  sendDelegate: MessagePort | null;
};

/**
 * 請參閱 twa-pm-bridge.js，這個 hook 會監聽 TWA 傳來的訊息，並呼叫 onMessage
 * @param onMessage 這是要監聽的，可以很多個一起監聽 onMessage，會在 TWA 傳來訊息時被呼叫
 * @returns bridge 物件，包含 port、connected、lastMessage、setPort、subscribe 等屬性
 *
 * 使用方式：
 * ```ts
 * const bridge = useTwaBridge((data, ev) => {
 *   console.log('Received message from TWA:', data);
 * });
 *
 * const send = bridge?.postMessage({ type: 'my-message', payload: { ... } });
 * ```
 *
 */
export function useTwaBridge(
  onMessage: (data: any, ev: MessageEvent) => TwaBridge | void,
) {
  const latest = useRef(onMessage);
  latest.current = onMessage;
  const bridge: TwaBridge = (window as any).__NBL_TWA_BRIDGE__;

  useEffect(() => {
    if (!bridge) return;

    // wrapper 會呼叫最新 handler
    const wrapper: (data: any, ev: MessageEvent) => void = (data, ev) => {
      try {
        latest.current?.(data, ev);
      } catch (e) {
        console.error(e);
      }
    };

    const unsub = bridge.subscribe(wrapper, { replay: true });
    return () => unsub();
  }, []);
  return bridge;
}

/**
 * 根據 twa-pm-bridge.js 與 LauncherActivity.java 裡面 handleIncomingMessage 的邏輯，用 MessageChannel 來模擬 JAVA 端的 PostMessage 與 onMessage 的行為，這樣就可以在 PWA 端測試 TWA 的訊息傳遞
 */
export function mimicTwaMessageChannel() {
  const channel = new MessageChannel();
  const bridge: TwaBridge = (window as any).__NBL_TWA_BRIDGE__;
  if (!bridge) return;
  // 1. 設定 bridge 的 port 為 channel.port1
  bridge.setPort(channel.port1);
  // 2. 設定 channel.port2 的 onmessage handler，當收到訊息時，根據 handleIncomingMessage 的邏輯，postMessage 回去給 bridge.port
  channel.port2.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    const requestId = data.requestId;
    let responseType = "";
    switch (data?.type) {
      case "nbl:ping":
        responseType = "nbl:pong";
        // 回傳給 PWA 端，模擬 TWA 端的 pong 訊息
        channel.port2.postMessage(
          JSON.stringify({
            type: responseType,
            requestId,
          }),
        );
        break;
      case "nbl:notify":
        break; // TWA 端的通知訊息不需要回傳給 PWA
      case "nbl:query-notification-permission":
        responseType = "nbl:notification-permission-status";
        // 回傳給 PWA 端，模擬 TWA 端的通知權限狀態
        const permission = Notification.permission;
        channel.port2.postMessage(
          JSON.stringify({
            type: responseType,
            granted: permission === "granted",
            requestId,
          }),
        );
        break;
      case "nbl:request-exact-alarm-permission":
        // 回傳給 PWA 端，模擬調出 TWA 端的精確鬧鐘權限頁面
        break;
      case "nbl:set-alarms":
        responseType = "nbl:set-alarms-result";
        /*
         * PWA 送{"type":"nbl:set-alarms","alarms":[
         *   {"id":1001,"mode":"clock","time":[13,30],"label":"clock test1...","skipUi":true},
         *   {"id":1002,"mode":"clock","time":[14,30],"label":"clock test2...","days":[2,3,4,5,6],"skipUi":true},
         *   {"id":1003,"mode":"exact","time":[2026,8,23,13,03],"label":"..."}
         * ]}
         * TWA 回 {"type":"nbl:set-alarms-result","results":[{"id":1001,"mode":"clock", "ok":true},{"id":1002,"mode":"clock", "ok":true},{"id":1003,"mode":"exact", "ok":false, "reason":"past_time"}]}
         */
        const alarms = data.alarms;
        const results = alarms.map((alarm: any) => {
          if (alarm.mode === "exact") {
            return {
              id: alarm.id,
              mode: alarm.mode,
              ok: true, //false,
              reason: "permission_required",
            };
          } else {
            return { id: alarm.id, mode: alarm.mode, ok: true };
          }
        });
        channel.port2.postMessage(
          JSON.stringify({
            type: responseType,
            results,
            requestId,
          }),
        );
        break;
      case "nbl:query-alarm-setup":
        // 回傳給 PWA 端，模擬 TWA 端的允許鬧鐘設定頁面
        responseType = "nbl:alarm-setup";
        channel.port2.postMessage(
          JSON.stringify({
            type: responseType,
            selectedClockApp: {
              packageName: "com.android.deskclock",
              label: "鬧鐘時鐘",
            },
            exactAlarmAllowed: true,
            requestId,
          }),
        );
        break;
      case "nbl:query-clock-apps":
        // 回傳給 PWA 端，模擬 TWA 端的可用鬧鐘應用程式列表
        responseType = "nbl:clock-apps";
        channel.port2.postMessage(
          JSON.stringify({
            type: responseType,
            apps: [
              { packageName: "com.android.deskclock", label: "鬧鐘時鐘" },
              {
                packageName: "com.google.android.deskclock",
                label: "Google 鬧鐘",
              },
            ],
            selectedPackageName: "com.android.deskclock",
            requestId,
          }),
        );
        break;
      case "nbl:select-clock-app":
        // 回傳給 PWA 端，模擬 TWA 端的選擇鬧鐘應用程式結果
        responseType = "nbl:select-clock-app-result";
        channel.port2.postMessage(
          JSON.stringify({
            type: responseType,
            selectedClockApp: {
              packageName: "com.android.deskclock",
              label: "鬧鐘時鐘",
            },
            requestId,
          }),
        );
        break;
      default:
        break;
    }
  };
}

export const twaBridge: TwaBridge = (window as any).__NBL_TWA_BRIDGE__;
