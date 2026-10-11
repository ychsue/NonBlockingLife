import { useEffect, useMemo, useState } from "react";
import { useTwaRpc } from "../hooks/useTwaRpc";
import {
  createTwaBridge,
  createWebBridge,
  negotiateHello,
  NativeBridge,
  NativeCapability,
} from "./NativeBridge";

/** 依執行環境回傳 NativeBridge；有 window.__NBL_TWA_BRIDGE__ 時為 twa（啟動後以 nbl:hello 協商能力），否則為 web */
export function useNativeBridge(): NativeBridge {
  const { sendRequest } = useTwaRpc();
  const hasShell =
    typeof window !== "undefined" && !!(window as any).__NBL_TWA_BRIDGE__?.port;
  const [caps, setCaps] = useState<NativeCapability[] | undefined>();

  useEffect(() => {
    if (!hasShell) return;
    let cancelled = false;
    negotiateHello(sendRequest).then((info) => {
      if (!cancelled) setCaps(info.capabilities);
    });
    return () => {
      cancelled = true;
    };
  }, [hasShell, sendRequest]);

  return useMemo(
    () => (hasShell ? createTwaBridge(sendRequest, caps) : createWebBridge()),
    [hasShell, sendRequest, caps],
  );
}
