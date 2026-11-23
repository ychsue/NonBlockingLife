import { useRef, useCallback } from "react";
import { useTwaBridge } from "./useTwaBridge";
import { useAppStore } from "../store/appStore";
import { executeUrlActionFromUrl } from "./useUrlAction";
import _ from "lodash";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
}

// 處理來在 host 的請求
interface HostRequest {
  requestId: string;
  dataObj: any;
  dealt?: boolean;
  timestamp: number;
}

interface SendRequestOptions {
  /** 是否需要等待 TWA 回傳 response，預設為 true */
  expectResponse?: boolean;
  /** 超時時間 (ms)，預設為 3000ms */
  timeoutMs?: number;
}

// 不應該放在 useTwaRpc 裡面，因為這些是全域的狀態，應該放在模組層級
let hostRequestsGlobal: HostRequest[] = [];
let pendingRequestsGlobal: Map<string, PendingRequest> = new Map();

export function useTwaRpc() {
  const setNeedToCheckTwaChannelDebounced = useAppStore(
    (state) => state.setNeedToCheckTwaChannelDebounced,
  );

  // 監聽來自 TWA 的回應
  const bridge = useTwaBridge((data) => {
    try {
      setNeedToCheckTwaChannelDebounced(false); // 因為有收到 TWA 回應，所以不需要再檢查 TWA channel
      const dataObj = typeof data === "string" ? JSON.parse(data) : data;
      // 假設 TWA 回傳的資料中有帶 requestId
      // console.debug('useTwaRpc::Received message from TWA:', dataObj);
      if (dataObj.requestId && pendingRequestsGlobal.has(dataObj.requestId)) {
        const { resolve, timer } = pendingRequestsGlobal.get(
          dataObj.requestId,
        )!;
        clearTimeout(timer);
        pendingRequestsGlobal.delete(dataObj.requestId);
        resolve(dataObj);
      } else if (dataObj.requestId?.startsWith("host_")) {
        // 若已經存在在 hostRequests 中，且已經處理，並且還在時間內，表示這是重複的請求，可以選擇忽略或更新
        function isExpired(req: HostRequest) {
          return Date.now() - req.timestamp > 3000;
        }
        function reactToHostRequest(req: HostRequest) {
          // 這裡可以加入對 host request 的處理邏輯
          console.debug("useTwaRpc::Reacting to host request:", req.requestId);
          // 處理來自 host 的回應，目前很粗糙
          if (dataObj.type === "nbl:url-action") {
            // 這裡可以加入處理 host 發送的 url-action 的邏輯
            console.debug("useTwaRpc::Received host url-action:", req.dataObj);
            executeUrlActionFromUrl(req.dataObj.url, {
              onNavigate: (sheet, byAction) => {
                useAppStore.getState().setCurrentSheet(sheet, byAction);
              },
              clientId: "host",
            });
          }
        }

        // 1. 先清除已經過期且處理過的
        hostRequestsGlobal = hostRequestsGlobal.filter(
          (req) => !(req.dealt && isExpired(req)),
        );
        const existing = hostRequestsGlobal.find(
          (req) => req.requestId === dataObj.requestId,
        );
        console.debug("useTwaRpc::Existing host request:", existing);
        const now = Date.now();
        if (existing) {
          if (!isExpired(existing)) {
            // 還在有效時間內，就只更新timestamp
            console.debug(
              "useTwaRpc::Duplicate host request:",
              dataObj.requestId,
              existing,
            );
            existing.timestamp = now; // 更新 timestamp
          } else if (isExpired(existing)) {
            // 過時，但還沒處理  (暫時)先移除
            console.debug(
              "useTwaRpc::Expired host request, removing:",
              dataObj.requestId,
              existing,
            );
            hostRequestsGlobal = hostRequestsGlobal.filter(
              (req) => req.requestId !== dataObj.requestId,
            );
          }
        } else {
          const request: HostRequest = {
            requestId: dataObj.requestId,
            dataObj: dataObj,
            dealt: true,
            timestamp: now,
          };
          hostRequestsGlobal.push(request);
          console.debug(
            "useTwaRpc::Added new host request:",
            dataObj.requestId,
            request,
          );
          // 開始處理
          reactToHostRequest(request);
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  const sendRequest = useCallback(
    (
      type: string,
      payload: Record<string, any> = {},
      options: SendRequestOptions = {},
    ) => {
      const { expectResponse = true, timeoutMs = 3000 } = options;

      if (!expectResponse) {
        // 如果不需要等待回應，直接發送訊息即可
        const success = bridge?.postMessage(
          JSON.stringify({ type, ...payload }),
        );
        return Promise.resolve(!!success);
      }
      return new Promise((resolve, reject) => {
        const requestId = `pwa_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; // 加上 pwa 前綴，避免與其他來源的 requestId 衝突

        // 設定逾時處理
        const timer = setTimeout(() => {
          if (pendingRequestsGlobal.has(requestId)) {
            // console.debug(`useTwaRpc::Timeout`, pendingRequests.current, requestId);
            pendingRequestsGlobal.delete(requestId);
            reject(
              new Error(`TWA request ${type} timed out after ${timeoutMs}ms`),
            );
          }
        }, timeoutMs);

        // console.debug(`useTwaRpc::Sending request to TWA:`, { type, requestId, payload });
        pendingRequestsGlobal.set(requestId, { resolve, reject, timer });

        // 發送訊息 (附帶 requestId)
        const success = bridge?.postMessage(
          JSON.stringify({ type, requestId, ...payload }),
        );

        if (!success) {
          clearTimeout(timer);
          pendingRequestsGlobal.delete(requestId);
          reject(new Error("Failed to postMessage to TWA bridge"));
        }
      });
    },
    [bridge],
  );

  return { sendRequest };
}
