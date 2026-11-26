import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "../../store/appStore";

import androidSVG from "./android.svg";
import windowsSVG from "./windows11.svg";

import { RuntimeWebDialog } from "./RuntimeWebDialog";
import { RuntimeNativeDialog } from "./RuntimeNativeDialog";
import { HelloShellKind } from "../../native/NativeBridge";

export function RuntimeBadge({ className }: { className?: string }) {
  const capabilitiesAndKind = useAppStore((state) => state.capabilitiesAndKind);

  const [showDialog, setShowDialog] = useState(false);
  const [runtimeType, setRuntimeType] = useState<HelloShellKind | undefined>(
    undefined,
  );

  useEffect(() => {
    const runtime: HelloShellKind =
      capabilitiesAndKind?.kind ??
      (window.matchMedia("(display-mode: standalone)").matches ? "pwa" : "web");
    setRuntimeType(runtime);
  }, [capabilitiesAndKind]);

  const runtimeConfig: Record<
    HelloShellKind,
    {
      title: string;
      icon: React.ReactNode;
    }
  > = {
    web: {
      title: "Web",
      icon: <>🌐</>,
    },
    pwa: {
      title: "PWA",
      icon: <>📦</>,
    },
    windows: {
      title: "Windows",
      icon: <img src={windowsSVG} alt="Windows" className="w-4 h-4" />,
    },
    android: {
      title: "Android",
      icon: <img src={androidSVG} alt="Android" className="w-4 h-4" />,
    },
    linux: {
      title: "Linux",
      icon: <>🐧</>,
    },
    unknown: {
      title: "Unknown",
      icon: <>❓</>,
    },
  };

  const config = useMemo(
    () => runtimeConfig[runtimeType ?? "unknown"],
    [runtimeType],
  );

  const canUpgrade = useMemo(
    () => runtimeType === "web" || runtimeType === "pwa",
    [runtimeType],
  );

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={` flex items-center gap-1 flex-col px-2 py-1 text-xs rounded-md border ${className}`}
      >
        {config.icon}
        <span>{config.title}</span>
      </button>
      {canUpgrade && (
        <RuntimeWebDialog
          type={runtimeType}
          show={showDialog}
          onClose={() => setShowDialog(false)}
        />
      )}
      {!canUpgrade && (
        <RuntimeNativeDialog
          type={runtimeType}
          show={showDialog}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
