namespace Nbl.Bridge;

public enum ProtocolActionKind { ShowClock, SetTimer, Navigate }

public sealed record ProtocolAction(ProtocolActionKind Kind, Uri? Target = null);

/// <summary>
/// 解析 nonblockinglife:// 連結。預設行為：把 scheme+host+path 換成 PWA 基底網址，只保留 query 與 fragment；
/// show-clock 這類桌面殼自己能處理的 host 則直接交給殼。
/// </summary>
public static class ProtocolUri
{
    public const string Scheme = "nonblockinglife";
    private const int MaxLength = 2048;

    public static ProtocolAction? Resolve(string? raw, Uri pwaBase)
    {
        if (string.IsNullOrWhiteSpace(raw) || raw.Length > MaxLength) return null;
        if (raw.Any(char.IsControl)) return null;

        var prefix = Scheme + ":";
        if (!raw.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return null;
        var rest = raw[prefix.Length..];
        if (rest.StartsWith("//")) rest = rest[2..];

        var cut = rest.IndexOfAny(new[] { '?', '#' });
        var hostAndPath = cut >= 0 ? rest[..cut] : rest;
        var suffix = cut >= 0 ? rest[cut..] : "";
        var host = hostAndPath.Split('/', 2)[0];

        if (host.Equals("show-clock", StringComparison.OrdinalIgnoreCase))
        {
            return new ProtocolAction(ProtocolActionKind.ShowClock);
        }
        else if (host.Equals("set-timer", StringComparison.OrdinalIgnoreCase))
        {
            return Uri.TryCreate(raw, UriKind.Absolute, out var target) ? new ProtocolAction(ProtocolActionKind.SetTimer, target) : null;
        }
        else
        {
            var baseUrl = pwaBase.GetLeftPart(UriPartial.Path);
            return Uri.TryCreate(baseUrl + suffix, UriKind.Absolute, out var target)
                ? new ProtocolAction(ProtocolActionKind.Navigate, target)
                : null;
        }
    }
}
