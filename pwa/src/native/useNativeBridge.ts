import { useEffect, useMemo, useState } from "react";
import { useTwaRpc } from "../hooks/useTwaRpc";
import {
  createTwaBridge,
  createWebBridge,
  HelloInfo,
  negotiateHello,
  NativeBridge,
} from "./NativeBridge";

// 每個 port 只協商一次，避免多個元件各送一次 hello
const helloCache = new WeakMap<object, Promise<HelloInfo>>();

function cachedHello(sendRequest: Parameters<typeof negotiateHello>[0]) {
  const port = (window as any).__NBL_TWA_BRIDGE__?.port as object | undefined;
  if (!port) return negotiateHello(sendRequest);
  let p = helloCache.get(port);
  if (!p) {
    p = negotiateHello(sendRequest);
    helloCache.set(port, p);
  }
  return p;
}

/** 依執行環境回傳 NativeBridge;有 window.__NBL_TWA_BRIDGE__ 時為 twa（啟動後以 nbl:hello 協商能力），否則為 web */
export function useNativeBridge(): NativeBridge {
  const { sendRequest } = useTwaRpc();
  const readPort = () =>
    typeof window !== "undefined" && !!(window as any).__NBL_TWA_BRIDGE__?.port;
  const [hasShell, setHasShell] = useState(readPort);
  const [info, setInfo] = useState<HelloInfo | undefined>();

  // 桌面殼會在頁面載入後才注入 port，所以要監聽 twa-pm-bridge.js 發出的事件
  useEffect(() => {
    const onConnected = () => setHasShell(readPort());
    window.addEventListener("nbl-bridge-connected", onConnected);
    onConnected();
    return () => window.removeEventListener("nbl-bridge-connected", onConnected);
  }, []);

  useEffect(() => {
    if (!hasShell) return;
    let cancelled = false;
    cachedHello(sendRequest).then((i) => {
      if (!cancelled) setInfo(i);
    });
    return () => {
      cancelled = true;
    };
  }, [hasShell, sendRequest]);

  return useMemo(
    () =>
      hasShell
        ? createTwaBridge(
            sendRequest,
            info?.capabilities,
            info && info.shell !== "android" ? "desktop" : "twa",
          )
        : createWebBridge(),
    [hasShell, sendRequest, info],
  );
}
