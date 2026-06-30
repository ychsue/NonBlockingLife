import React, { forwardRef } from 'react'
import { useDialogStore } from './store/dialogStore'

export const GlobalDialog = forwardRef<HTMLDialogElement>((props, ref) => {
  const dialogConfig = useDialogStore((state) => state.dialogConfig)

  if (!dialogConfig) return null

  const handleActionClick = (e: React.MouseEvent<HTMLButtonElement>, actionId: string, openUrl?: string) => {
    e.preventDefault()
    
    // 💡 關鍵修正：透過 e.currentTarget.form 直接拿到該按鈕所屬的原生 <form>
    const formElement = e.currentTarget.form
    const data: Record<string, string> = {}

    if (formElement) {
      const formData = new FormData(formElement)
      formData.forEach((value, key) => {
        data[key] = String(value)
      })
    }

    // 如果有設定 openUrl，立刻【同步】開啟（iOS Safari 放行！）
    if (openUrl) {
      window.open(openUrl, '_blank', 'noopener,noreferrer')
    }

    // 回傳結果並關閉
    dialogConfig.resolve({ actionId, formData: data })
  }

  return (
    // 放到桌面正中央
    <dialog ref={ref} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 p-6 w-[90%] max-w-[500px] border-none rounded-lg bg-white shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <form onSubmit={(e) => e.preventDefault()}> {/* 防止按 Enter 重新整理頁面 */}
        <h3>{dialogConfig.title}</h3>
        <p>{dialogConfig.message}</p>

        {/* 動態 Inputs */}
        {dialogConfig.inputs && dialogConfig.inputs.map(input => (
          <div key={input.name} className="input-group">
            <label>{input.label}</label>
            <input type={input.type} name={input.name} defaultValue={input.defaultValue || ''} />
          </div>
        ))}

        {/* 動態 Actions */}
        <div className="dialog-actions flex justify-end gap-2 mt-4">
          {dialogConfig.actions.map((action) => (
            <button
              key={action.id}
              type="button" // 改成 button，避免觸發預設的 submit 導致難以控制
              className={`px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 ${action.className}`}
              onClick={(e) => handleActionClick(e, action.id, action.openUrlBeforeResolve)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </form>
    </dialog>
  )
})

// 幫元件加上顯示名稱，方便除錯
GlobalDialog.displayName = 'GlobalDialog'