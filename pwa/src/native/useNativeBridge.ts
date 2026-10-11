import { useMemo } from "react";
import { useTwaRpc } from "../hooks/useTwaRpc";
import { createTwaBridge, createWebBridge, NativeBridge } from "./NativeBridge";

/** 依執行環境回傳 NativeBridge；有 window.__NBL_TWA_BRIDGE__ 時為 twa，否則為 web */
export function useNativeBridge(): NativeBridge {
  const { sendRequest } = useTwaRpc();
  const hasShell =
    typeof window !== "undefined" && !!(window as any).__NBL_TWA_BRIDGE__;
  return useMemo(
    () => (hasShell ? createTwaBridge(sendRequest) : createWebBridge()),
    [hasShell, sendRequest],
  );
}
