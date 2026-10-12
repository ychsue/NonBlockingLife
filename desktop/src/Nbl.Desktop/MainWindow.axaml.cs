using System.Diagnostics;
using System.Text.Json;
using Avalonia.Controls;
using Avalonia.Threading;
using Nbl.Bridge;

namespace Nbl.Desktop;

public partial class MainWindow : Window
{
    // 在頁面載入後建立與 twa-pm-bridge.js 相容的 port（只需 postMessage / onmessage / start）
    private const string Shim = """
        (function () {
          if (window.__NBL_DESKTOP_SHIM__) return;
          window.__NBL_DESKTOP_SHIM__ = true;
          var send = function (s) {
            if (typeof invokeCSharpAction === 'function') invokeCSharpAction(s);
            else if (window.chrome && window.chrome.webview) window.chrome.webview.postMessage(s);
          };
          var port = { onmessage: null, start: function () {},
                       postMessage: function (m) { send(typeof m === 'string' ? m : JSON.stringify(m)); } };
          window.__nblDesktopReceive = function (s) { if (port.onmessage) port.onmessage({ data: s }); };
          var b = window.__NBL_TWA_BRIDGE__;
          if (b) b.setPort(port);
        })();
        """;

    private readonly OriginPolicy _origins;
    private readonly BridgeDispatcher _dispatcher;
    private readonly LocalStaticServer? _server;

    public MainWindow() : this(LaunchOptions.Parse(Array.Empty<string>()), null, null) { }

    public bool AllowClose { get; set; }

    public MainWindow(LaunchOptions options, IDesktopHost? host, AlarmScheduler? alarms)
    {
        InitializeComponent();
        Closing += (_, e) =>
        {
            if (AllowClose || host is null) return;
            e.Cancel = true;
            Hide();
        };
        _origins = new OriginPolicy(options.AllowedOrigins);
        _dispatcher = new BridgeDispatcher("windows", "0.1.0", new HttpIcsFetcher(), host, alarms);

        if (options.Source == LoadSource.Dist)
        {
            _server = new LocalStaticServer(options.DistPath ?? FindDist(), options.LocalPort);
            _server.Start();
            Closed += (_, _) => _server.Dispose();
        }

        Web.EnvironmentRequested += (_, e) =>
        {
            if (e is Avalonia.Platform.WindowsWebView2EnvironmentRequestedEventArgs w)
            {
                w.UserDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "NonBlockingLife", "WebView2");
                // 讓 VSCode 的 msedge 配置可附加到此 WebView2 進行 PWA 除錯
                if (options.Source == LoadSource.Dev)
                    w.AdditionalBrowserArguments = "--remote-debugging-port=9222";
            }
        };
        Web.NavigationStarted += (_, e) =>
        {
            if (e.Request is { } uri && !_origins.IsAllowed(uri))
            {
                e.Cancel = true;
                if (ExternalUriPolicy.IsSafe(uri))
                    Process.Start(new ProcessStartInfo(uri.ToString()) { UseShellExecute = true });
                else
                    Trace.WriteLine($"[nbl] blocked navigation to {uri}");
            }
        };
        Web.NavigationCompleted += async (_, _) =>
        {
            if (_origins.IsAllowed(Web.Source ?? new Uri("about:blank")))
                await Web.InvokeScript(Shim);
        };
        Web.WebMessageReceived += OnWebMessage;
        Web.Source = options.StartUri;
    }

    private async void OnWebMessage(object? sender, WebMessageReceivedEventArgs e)
    {
        var body = e.Body;
        if (string.IsNullOrEmpty(body)) return;
        Trace.WriteLine($"[nbl] <- {body}");
        var reply = await _dispatcher.HandleAsync(body);
        if (reply is null) return;
        Trace.WriteLine($"[nbl] -> {reply}");
        var js = $"window.__nblDesktopReceive && window.__nblDesktopReceive({JsonSerializer.Serialize(reply)});";
        await Dispatcher.UIThread.InvokeAsync(() => Web.InvokeScript(js));
    }

    private static string FindDist()
    {
        for (var d = new DirectoryInfo(AppContext.BaseDirectory); d != null; d = d.Parent)
        {
            var c = Path.Combine(d.FullName, "pwa", "dist");
            if (Directory.Exists(c)) return c;
        }
        throw new DirectoryNotFoundException("pwa/dist not found; use --dist-path");
    }
}
