import { useRef, useCallback } from 'react';
import { useTwaBridge } from './useTwaBridge';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
}

interface SendRequestOptions {
  /** 是否需要等待 TWA 回傳 response，預設為 true */
  expectResponse?: boolean;
  /** 超時時間 (ms)，預設為 3000ms */
  timeoutMs?: number;
}

export function useTwaRpc() {
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());

  // 監聽來自 TWA 的回應
  const bridge = useTwaBridge((data) => {
    try {
      const dataObj = typeof data === 'string' ? JSON.parse(data) : data;
      // 假設 TWA 回傳的資料中有帶 requestId
      // console.debug('useTwaRpc::Received message from TWA:', dataObj);
      if (dataObj.requestId && pendingRequests.current.has(dataObj.requestId)) {
        const { resolve, timer } = pendingRequests.current.get(dataObj.requestId)!;
        clearTimeout(timer);
        pendingRequests.current.delete(dataObj.requestId);
        resolve(dataObj);
      }
    } catch (e) {
      console.error(e);
    }
  });

  const sendRequest = useCallback(
    (type: string, payload: Record<string, any> = {}, options: SendRequestOptions = {}) => {
      const { expectResponse = true, timeoutMs = 3000 } = options;

      if (!expectResponse) {
        // 如果不需要等待回應，直接發送訊息即可
        const success = bridge?.postMessage(JSON.stringify({ type, ...payload }));
        return Promise.resolve(!!success);
      }
      return new Promise((resolve, reject) => {
        const requestId = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        // 設定逾時處理
        const timer = setTimeout(() => {
          if (pendingRequests.current.has(requestId)) {
            // console.debug(`useTwaRpc::Timeout`, pendingRequests.current, requestId);
            pendingRequests.current.delete(requestId);
            reject(new Error(`TWA request ${type} timed out after ${timeoutMs}ms`));
          }
        }, timeoutMs);

        // console.debug(`useTwaRpc::Sending request to TWA:`, { type, requestId, payload });
        pendingRequests.current.set(requestId, { resolve, reject, timer });

        // 發送訊息 (附帶 requestId)
        const success = bridge?.postMessage(
          JSON.stringify({ type, requestId, ...payload })
        );

        if (!success) {
          clearTimeout(timer);
          pendingRequests.current.delete(requestId);
          reject(new Error('Failed to postMessage to TWA bridge'));
        }
      });
    },
    [bridge]
  );

  return { sendRequest };
}