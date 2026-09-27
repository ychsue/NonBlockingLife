import { useEffect } from "react";

interface BaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

export function BaseDialog({ isOpen, onClose, children, className }: BaseDialogProps) {
  // 當開啟時，禁止底層頁面滾動（非必要，但對行動端 PWA 體驗極好）
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null; // 條件渲染：不存在於 DOM 中，徹底根除幽靈遮罩 Bug！

  return (
    // 使用 fixed 滿版，並確保 z-index 夠高但仍可與 Joyride 協調
    <div className={`fixed inset-0 z-8888 flex items-center justify-center p-4 ${className ?? ""}`}>
      {/* 黑色半透明背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 對話框主體內容 */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full z-10 overflow-visible transform transition-all active:scale-100">
        {children}
      </div>
    </div>
  );
}
