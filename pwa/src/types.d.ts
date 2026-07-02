import '@tanstack/react-table'

declare module '@tanstack/react-table' {
  // 擴充官方的 ColumnMeta 介面
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string; // 加上你需要的自訂屬性
  }
}
