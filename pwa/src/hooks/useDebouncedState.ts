import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useDebouncedState 是一個自定義的 React Hook，用於管理具有防抖功能的狀態。它返回一個包含三個元素的陣列：
 * 1. debouncedValue：防抖後的狀態值，只有在指定的延遲時間內沒有新的更新時才會更新。
 * 2. setDebouncedValue：用於更新狀態值的函數。
 * 3. immediateValue：立即更新的狀態值，無論防抖延遲如何，都會立即反映最新的值。
 * @param initialValue 初始值
 * @param [delay] 可選，防抖延遲時間，單位為毫秒，預設為 300 毫秒
 * 
 * @returns [debouncedValue, setDebouncedValue, immediateValue]
 */
export function useDebouncedState<T>(initialValue: T, delay: number=300): [T, (value: T) => void, T] {
    const timeRef = useRef<NodeJS.Timeout | null>(null);
    const [immediateValue, setImmediateValue] = useState<T>(initialValue);
    const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

    const setValue = useCallback((value: T) => {
        // 立即更新 immediateValue
        setImmediateValue(value);

        // 清除之前的計時器
        if (timeRef.current) {
            clearTimeout(timeRef.current);
        }

        // 設置新的計時器，延遲更新 debouncedValue
        timeRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
    }, [delay]);

    // 在組件卸載時清除計時器，避免內存洩漏
    useEffect(() => {
        return () => {
            if (timeRef.current) {
                clearTimeout(timeRef.current);
            }
        };
    }, []);

    return [debouncedValue, setValue, immediateValue];
}