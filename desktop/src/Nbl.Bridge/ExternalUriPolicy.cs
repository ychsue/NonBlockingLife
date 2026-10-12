namespace Nbl.Bridge;

/// <summary>殼內 WebView 導向非 PWA origin 時，允許交給作業系統開啟的 URI（其餘一律丟棄）。</summary>
public static class ExternalUriPolicy
{
    // ms-clock 是 shortcutUtils.ts 在 Windows 上使用的系統時鐘協定
    private static readonly HashSet<string> Schemes = new(StringComparer.OrdinalIgnoreCase)
    {
        "http", "https", "mailto", "ms-clock",
    };

    public static bool IsSafe(Uri uri) => Schemes.Contains(uri.Scheme);
}
