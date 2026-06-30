// store/dialogStore.ts
import { create } from "zustand";

interface DialogAction {
  id: string;
  label: string;
  className?: string;
  // 關鍵：標記這個按鈕點擊時是否要同步執行 window.open
  openUrlBeforeResolve?: string;
}

interface DialogInputField {
  name: string;
  label: string;
  type: "text" | "number" | "password";
  defaultValue?: string;
}

export interface DialogConfig {
  title: string;
  message: string;
  inputs?: DialogInputField[];
  actions: DialogAction[];
  // 點擊按鈕後，回傳是哪顆按鈕被點了，以及表單填了什麼
  resolve: (value: {
    actionId: string;
    formData: Record<string, string>;
  }) => void;
}

interface DialogStore {
  dialogConfig: DialogConfig | null;
  openDialog: (
    config: Omit<DialogConfig, "resolve">,
  ) => Promise<{ actionId: string; formData: Record<string, string> }>;
}

export const useDialogStore = create<DialogStore>((set) => ({
  dialogConfig: null,
  openDialog: (config) => {
    return new Promise((resolve) => {
      set({
        dialogConfig: {
          ...config,
          resolve: (result) => {
            resolve(result);
            set({ dialogConfig: null }); // 關閉彈窗
          },
        },
      });
    });
  },
}));
