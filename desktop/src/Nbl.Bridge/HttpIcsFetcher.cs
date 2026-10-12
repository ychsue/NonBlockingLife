using System.Net;

namespace Nbl.Bridge;

/// <summary>以 HttpClient 抓 ICS：僅 http/https、有逾時與大小上限、內容須為 VCALENDAR。</summary>
public sealed class HttpIcsFetcher : IIcsFetcher
{
    public const int MaxBytes = 5 * 1024 * 1024;
    private readonly HttpClient _http;

    public HttpIcsFetcher(HttpClient? http = null)
    {
        _http = http ?? new HttpClient(new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.All,
            MaxAutomaticRedirections = 5,
        })
        { Timeout = TimeSpan.FromSeconds(15) };
    }

    public async Task<string> FetchAsync(string url, CancellationToken ct)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("http" or "https"))
            throw new ArgumentException("Only http/https URLs are allowed");

        using var res = await _http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
        res.EnsureSuccessStatusCode();
        if (res.Content.Headers.ContentLength > MaxBytes)
            throw new InvalidOperationException("ICS too large");

        await using var s = await res.Content.ReadAsStreamAsync(ct);
        using var ms = new MemoryStream();
        var buf = new byte[81920];
        int n;
        while ((n = await s.ReadAsync(buf, ct)) > 0)
        {
            ms.Write(buf, 0, n);
            if (ms.Length > MaxBytes) throw new InvalidOperationException("ICS too large");
        }

        var text = System.Text.Encoding.UTF8.GetString(ms.ToArray());
        if (!text.TrimStart('\uFEFF', ' ', '\r', '\n', '\t').StartsWith("BEGIN:VCALENDAR"))
            throw new InvalidOperationException("Not an ICS document");
        return text;
    }
}
