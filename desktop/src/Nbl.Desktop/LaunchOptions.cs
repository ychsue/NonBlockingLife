namespace Nbl.Desktop;

public enum LoadSource { Online, Dist, Dev }

/// <summary>命令列：--source online|dist|dev  --dist-path &lt;dir&gt;  --dev-url &lt;url&gt;  --port &lt;n&gt;</summary>
public sealed record LaunchOptions(
    LoadSource Source,
    string OnlineUrl,
    string DevUrl,
    string? DistPath,
    int LocalPort)
{
    public const string DefaultOnlineUrl = "https://ychsue.github.io/NonBlockingLife/";
    // 固定連接埠：origin 改變會讓 IndexedDB / localStorage 變成另一份資料
    public const int DefaultLocalPort = 47615;

    public static LaunchOptions Parse(string[] args)
    {
        string Get(string name, string def)
        {
            var i = Array.IndexOf(args, name);
            return i >= 0 && i + 1 < args.Length ? args[i + 1] : def;
        }

        var source = Get("--source", "online").ToLowerInvariant() switch
        {
            "dist" => LoadSource.Dist,
            "dev" => LoadSource.Dev,
            _ => LoadSource.Online,
        };
        var port = int.TryParse(Get("--port", ""), out var p) ? p : DefaultLocalPort;
        var dist = Get("--dist-path", "");
        return new LaunchOptions(
            source,
            DefaultOnlineUrl,
            Get("--dev-url", "http://localhost:5173/"),
            dist.Length > 0 ? dist : null,
            port);
    }

    public Uri StartUri => Source switch
    {
        LoadSource.Dev => new Uri(DevUrl),
        LoadSource.Dist => new Uri($"http://127.0.0.1:{LocalPort}/NonBlockingLife/"),
        _ => new Uri(OnlineUrl),
    };

    public IEnumerable<string> AllowedOrigins => new[]
    {
        new Uri(OnlineUrl).GetLeftPart(UriPartial.Authority),
        new Uri(DevUrl).GetLeftPart(UriPartial.Authority),
        $"http://127.0.0.1:{LocalPort}",
    };
}
