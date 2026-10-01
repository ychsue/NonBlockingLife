// src/utils/parseEnv.js
export function parseEnvString(envString: string) {
  const result: Record<string, string> = {};

  envString.split("\n").forEach((line) => {
    // 去掉前後空白
    const trimmed = line.trim();

    // 跳過空行或註解
    if (!trimmed || trimmed.startsWith("#")) return;

    // 分割 key=value
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim();

    // 去掉可能的引號
    result[key] = value.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
  });

  return result;
}
