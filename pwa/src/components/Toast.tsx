import { useEffect } from "react";

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function Toast({
  message,
  duration = 3000,
  onClose,
  actionLabel,
  onAction,
  className,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in flex flex-wrap items-center gap-3 pb-safe-min ${className ?? ""}`}
    >
      {/* 右上角放個關閉按鈕 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 text-xs font-semibold text-white/70 hover:text-white"
      >
        ×
      </button>
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-2 py-1 text-xs font-semibold rounded bg-white/20 hover:bg-white/30"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
