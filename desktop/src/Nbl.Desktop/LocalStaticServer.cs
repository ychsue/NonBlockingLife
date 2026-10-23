using System.Net;

namespace Nbl.Desktop;

/// <summary>只綁 127.0.0.1，把 dist 資料夾以 /NonBlockingLife/ 前綴提供給 WebView（vite build 的 base）。</summary>
public sealed class LocalStaticServer : IDisposable
{
    private const string Prefix = "/NonBlockingLife/";
    private readonly HttpListener _listener = new();
    private readonly string _root;
    private readonly CancellationTokenSource _cts = new();

    public LocalStaticServer(string distPath, int port)
    {
        _root = Path.GetFullPath(distPath);
        _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
    }

    public void Start()
    {
        _listener.Start();
        _ = Task.Run(LoopAsync);
    }

    private async Task LoopAsync()
    {
        while (!_cts.IsCancellationRequested)
        {
            HttpListenerContext ctx;
            try { ctx = await _listener.GetContextAsync(); }
            catch { return; }
            _ = Task.Run(() => Serve(ctx));
        }
    }

    private void Serve(HttpListenerContext ctx)
    {
        try
        {
            var path = Uri.UnescapeDataString(ctx.Request.Url!.AbsolutePath);
            if (!path.StartsWith(Prefix, StringComparison.Ordinal)) { ctx.Response.StatusCode = 404; return; }
            var rel = path[Prefix.Length..];
            if (rel.Length == 0) rel = "index.html";

            var full = Path.GetFullPath(Path.Combine(_root, rel.Replace('/', Path.DirectorySeparatorChar)));
            if (!full.StartsWith(_root, StringComparison.OrdinalIgnoreCase)) { ctx.Response.StatusCode = 403; return; }
            if (!File.Exists(full)) full = Path.Combine(_root, "index.html"); // SPA fallback

            ctx.Response.ContentType = MimeFor(full);
            var bytes = File.ReadAllBytes(full);
            ctx.Response.ContentLength64 = bytes.Length;
            ctx.Response.OutputStream.Write(bytes);
        }
        catch { ctx.Response.StatusCode = 500; }
        finally { ctx.Response.Close(); }
    }

    private static string MimeFor(string f) => Path.GetExtension(f).ToLowerInvariant() switch
    {
        ".html" => "text/html; charset=utf-8",
        ".js" or ".mjs" => "text/javascript; charset=utf-8",
        ".css" => "text/css; charset=utf-8",
        ".json" or ".webmanifest" => "application/json; charset=utf-8",
        ".svg" => "image/svg+xml",
        ".png" => "image/png",
        ".ico" => "image/x-icon",
        ".woff2" => "font/woff2",
        ".wasm" => "application/wasm",
        _ => "application/octet-stream",
    };

    public void Dispose()
    {
        _cts.Cancel();
        _listener.Close();
    }
}
