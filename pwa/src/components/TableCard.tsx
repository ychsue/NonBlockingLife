import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { useT } from "../i18n";

export interface TableCardProps<T> {
  item: T;
  fields: Array<{
    label: string;
    value: ReactNode;
    className?: string;
  }>;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  quickAction?: {
    label: string;
    onClick: (item: T) => void;
  };
  compact?: boolean; // 🆕 是否為緊湊型卡片
  showDelete?: boolean; // 🆕 是否顯示刪除按鈕
  editLabel?: string; // 🆕 自訂「編輯/管理」文字
  isDisabled?: boolean; // 🆕 是否為停用狀態 (灰階/貫穿線)
  accentColor?: string; // 🆕 左側顏色區塊標籤
  className?: string; // 🆕 自訂卡片的 className
}

export function isUsableUrl(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value !== "None";
}

export function TableCard<
  T extends { taskId?: string | number; url?: string },
>({
  item,
  fields,
  onEdit,
  onDelete,
  quickAction,
  showDelete = true,
  editLabel,
  isDisabled = false,
  accentColor,
  className,
  compact,
}: TableCardProps<T>) {
  const t = useT();
  const displayEditLabel = editLabel ?? t("tableCard.edit");
  const [offsetX, setOffsetX] = useState(0);
  const [pendingDeleteConfirm, setPendingDeleteConfirm] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const swipingRef = useRef(false);
  const confirmTimerRef = useRef<number | null>(null);

  const SWIPE_MAX = 110;
  const SWIPE_TRIGGER = 70;
  const CONFIRM_WINDOW_MS = 3000;
  const itemUrl = isUsableUrl(item.url) ? item.url.trim() : null;
  const [isTouch] = useState(
    () => window.matchMedia("(hover: none) and (pointer: coarse)").matches,
  );

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current != null) {
        window.clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  const clearDeleteConfirmTimer = () => {
    if (confirmTimerRef.current != null) {
      window.clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
  };

  const beginDeleteConfirmation = () => {
    setPendingDeleteConfirm(true);
    clearDeleteConfirmTimer();
    confirmTimerRef.current = window.setTimeout(() => {
      setPendingDeleteConfirm(false);
      confirmTimerRef.current = null;
    }, CONFIRM_WINDOW_MS);
  };

  const cancelDeleteConfirmation = () => {
    setPendingDeleteConfirm(false);
    clearDeleteConfirmTimer();
  };

  const resetSwipe = () => {
    setOffsetX(0);
    startRef.current = null;
    swipingRef.current = false;
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    swipingRef.current = false;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = startRef.current;
    if (!start) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (!swipingRef.current) {
      if (Math.abs(deltaX) < 10) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }
      swipingRef.current = true;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, deltaX));
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    if (offsetX >= SWIPE_TRIGGER) {
      resetSwipe();
      cancelDeleteConfirmation();
      onEdit(item);
      return;
    }

    if (showDelete && offsetX <= -SWIPE_TRIGGER) {
      resetSwipe();
      if (pendingDeleteConfirm) {
        cancelDeleteConfirmation();
        onDelete(item);
      } else {
        beginDeleteConfirmation();
      }
      return;
    }

    resetSwipe();
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg border h-fit ${pendingDeleteConfirm ? "border-red-300" : "border-gray-200"} ${isDisabled ? "bg-gray-300 opacity-50" : "bg-white"} ${className ?? ""}`}
    >
      {/* 左側顏色區塊標籤 */}
      {accentColor && (
        <div
          className="absolute inset-y-0 left-0 w-2 rounded-l-lg z-10"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div
        className={`absolute inset-0 flex text-white text-sm font-semibold z-0`}
      >
        <div className="flex-1 bg-blue-500 flex items-center justify-start pl-4">
          {displayEditLabel}
        </div>
        <div className="flex-1 bg-red-500 flex items-center justify-end pr-4">
          {showDelete ? t("tableCard.delete") : t("tableCard.noDelete")}
        </div>
      </div>

      <div
        className={`relative p-4 shadow-sm transition-transform duration-150 ${isDisabled ? "bg-gray-300" : "bg-white"}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetSwipe}
      >
        <div
          className={`${compact ? "space-y-1 flex flex-row flex-wrap items-center justify-between" : "space-y-3"}`}
        >
          {fields.map((field, index) => (
            <div
              key={index}
              className={`flex justify-between items-start gap-2 ${field.className ?? ""}`}
            >
              {!!!compact && (
                <span className="text-sm font-medium text-gray-600">
                  {field.label}
                </span>
              )}
              <span className="text-sm text-gray-900 text-right flex-1">
                {field.value}
              </span>
            </div>
          ))}
        </div>

        {/* 按鈕(action)區塊 */}
        <div className="flex flex-col">
          {itemUrl && (
            <div className="mt-4 flex justify-end">
              <a
                href={itemUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
                onClick={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onTouchMove={(event) => event.stopPropagation()}
                onTouchEnd={(event) => event.stopPropagation()}
              >
                {t("tableCard.openLink")}
              </a>
            </div>
          )}

          {quickAction && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  cancelDeleteConfirmation();
                  quickAction.onClick(item);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded bg-amber-500 text-white hover:bg-amber-600"
              >
                {quickAction.label}
              </button>
            </div>
          )}

          {pendingDeleteConfirm && (
            <div className="mt-3 text-xs text-red-600 text-right">
              {t("tableCard.swipeDeleteConfirm")}
            </div>
          )}

          {!isTouch && (
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  cancelDeleteConfirmation();
                  onEdit(item);
                }}
                className="px-3 py-1 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                {t("tableCard.edit")}
              </button>
              {showDelete && (
                <button
                  onClick={() => {
                    if (pendingDeleteConfirm) {
                      cancelDeleteConfirmation();
                      onDelete(item);
                    } else {
                      beginDeleteConfirmation();
                    }
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded text-white ${
                    pendingDeleteConfirm
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-red-400 hover:bg-red-500"
                  }`}
                >
                  {pendingDeleteConfirm
                    ? t("tableCard.confirmDelete")
                    : t("tableCard.delete")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
