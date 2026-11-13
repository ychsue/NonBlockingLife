import { useEffect } from "react";

/**
 * 這個是當滾動結束時觸發 resize 事件的 hook
 * @param isRunning Whether the scroll handling should be active
 * @param stSelector The selector of the element to attach the scroll listener to
 * @returns None
 */
export function useScrollendThenResize(stSelector: string, isRunning = false) {
  useEffect(() => {
    const element = document.querySelector(stSelector);
    if (!element) return;
    const handler = (e: Event) => {
      if (isRunning) {
        window.dispatchEvent(new Event("resize"));
      }
    };
    element.addEventListener("scrollend", handler);
    return () => {
      element.removeEventListener("scrollend", handler);
    };
  }, [isRunning, stSelector]);
}
