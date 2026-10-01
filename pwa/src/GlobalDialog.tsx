import React, { forwardRef } from "react";
import { useDialogStore } from "./store/dialogStore";

export const GlobalDialog = forwardRef<HTMLDialogElement>((props, ref) => {
  const dialogConfig = useDialogStore((state) => state.dialogConfig);
  if (!dialogConfig) return null;

  if (!dialogConfig?.type) dialogConfig.type = "info";

  const handleActionClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    actionId: string,
    openUrl?: string,
  ) => {
    e.preventDefault();

    // 💡 關鍵修正：透過 e.currentTarget.form 直接拿到該按鈕所屬的原生 <form>
    const formElement = e.currentTarget.form;
    const data: Record<string, string> = {};

    if (formElement) {
      const formData = new FormData(formElement);
      formData.forEach((value, key) => {
        data[key] = String(value);
      });
    }

    // 如果有設定 openUrl，立刻【同步】開啟（iOS Safari 放行！）
    if (openUrl) {
      window.open(openUrl, "_blank", "noopener,noreferrer");
    }

    // 回傳結果並關閉
    dialogConfig.resolve({ actionId, formData: data });
  };

  return (
    // 放到桌面正中央
    <dialog
      ref={ref}
      className={
        `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 w-[90%] max-w-125 border-none rounded-lg shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm` +
        (dialogConfig.type === "spiner"
          ? " pointer-events-none bg-white overflow-hidden"
          : "  bg-white")
      }
    >
      <div className="flex flex-col items-center">
        <h3
          className={
            "w-full text-lg p-4 font-semibold mb-4 text-center" +
            (dialogConfig.type === "spiner"
              ? " bg-gray-100"
              : dialogConfig.type === "error"
                ? "bg-red-700 text-white"
                : dialogConfig.type === "success"
                  ? "bg-green-700 text-white"
                  : dialogConfig.type === "warning"
                    ? "bg-yellow-700 text-white"
                    : " bg-blue-500 text-white")
          }
        >
          {dialogConfig.title}
        </h3>
        <h4 className="mb-4 text-lg">{dialogConfig.message}</h4>
        {/* 防止按 Enter 重新整理頁面 */}
        {dialogConfig.type === "spiner" ? (
          <div className="spinner self-center"></div>
        ) : (
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col p-6"
          >
            {/* 動態 Inputs */}
            {dialogConfig.inputs &&
              dialogConfig.inputs.map((input) => (
                <div key={input.name} className="input-group mb-4">
                  <label className="block mb-1">{input.label}</label>
                  <input
                    type={input.type}
                    name={input.name}
                    defaultValue={input.defaultValue || ""}
                    className={`w-full border border-gray-300 rounded-md p-2 ${input.className || ""}`}
                  />
                </div>
              ))}
            {/* 動態 Selects */}
            {dialogConfig.selects &&
              dialogConfig.selects.map((select) => (
                <div key={select.name} className="select-group mb-4">
                  <label className="block mb-1">{select.label}</label>
                  <select
                    name={select.name}
                    defaultValue={select.defaultValue || ""}
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    {select.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            {/* 動態 Actions */}
            <div className="dialog-actions flex justify-end gap-2 mt-4">
              {dialogConfig.actions.map((action) => (
                <button
                  key={action.id}
                  type="button" // 改成 button，避免觸發預設的 submit 導致難以控制
                  className={`px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 ${action.className}`}
                  onClick={(e) =>
                    handleActionClick(e, action.id, action.openUrlBeforeResolve)
                  }
                >
                  {action.label}
                </button>
              ))}
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
});

// 幫元件加上顯示名稱，方便除錯
GlobalDialog.displayName = "GlobalDialog";
