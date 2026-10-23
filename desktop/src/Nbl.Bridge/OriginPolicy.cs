namespace Nbl.Bridge;

/// <summary>限制殼內 WebView 只能停留在 PWA 自己的 origin；其餘交給系統瀏覽器。</summary>
public sealed class OriginPolicy
{
    private readonly HashSet<string> _origins;

    public OriginPolicy(IEnumerable<string> allowedOrigins)
    {
        _origins = new HashSet<string>(
            allowedOrigins.Select(Normalize), StringComparer.OrdinalIgnoreCase);
    }

    public bool IsAllowed(Uri uri)
    {
        if (uri.Scheme is "about" or "data" or "blob") return true;
        return _origins.Contains(Normalize(uri.GetLeftPart(UriPartial.Authority)));
    }

    private static string Normalize(string s) => s.TrimEnd('/');
}
