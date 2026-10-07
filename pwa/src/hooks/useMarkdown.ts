import { useState, useEffect } from "react";
import { SupportedLocale, useTWithMaps } from "../i18n";

// 一次捕捉 docs 資料夾下所有子目錄的 .md 檔案，並以純文字 (raw) 讀取
const allMarkdownFiles = import.meta.glob("/src/docs/**/*.md", { as: "raw" });

/**
 * 通用動態載入 Markdown 的 Hook
 * @param {string} pageKey 資料夾名稱 (例如: 'about', 'faq')
 * @param {string} lang 語言代碼 (例如: 'zh', 'en')
 */
export function useMarkdown(pageKey: string, lang: SupportedLocale) {
  const [content, setContent] = useState(
    lang === "zh-TW" ? "載入中..." : "Loading...",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const tHere = useTWithMaps({
    "zh-TW": {
      載入失敗: "載入 {n} 失敗",
      無法載入該語言的內容: "無法載入該語言的內容",
      找不到該頁面或語言的檔案: "找不到該頁面或語言的檔案 ({n})",
    },
    en: {
      載入失敗: "Failed to load {n}",
      無法載入該語言的內容: "Unable to load content for this language",
      找不到該頁面或語言的檔案:
        "Cannot find the file for this page or language ({n})",
    },
    ja: {
      載入失敗: "読み込みに失敗しました {n}",
      無法載入該語言的內容: "この言語のコンテンツを読み込めません",
      找不到該頁面或語言的檔案:
        "このページまたは言語のファイルが見つかりません ({n})",
    },
  });

  useEffect(() => {
    // 組合出 Vite 識別的絕對/相對路徑
    const filePath = `/src/docs/${pageKey}/${lang}.md`;

    // 檢查檔案是否存在
    if (allMarkdownFiles[filePath]) {
      setLoading(true);
      setError(null);

      allMarkdownFiles[filePath]()
        .then((text) => {
          setContent(text);
          setLoading(false);
        })
        .catch((err) => {
          console.error(tHere("載入失敗", { n: filePath }), err);
          setError(err);
          setLoading(false);
          setContent(tHere("無法載入該語言的內容"));
        });
    } else {
      setLoading(false);
      setContent(
        tHere("找不到該頁面或語言的檔案", { n: `${pageKey}/${lang}` }),
      );
    }
  }, [pageKey, lang]); // 當頁面 key 或語言改變時，自動重新載入

  return { content, loading, error };
}
