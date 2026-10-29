using System.Diagnostics;
using System.Text.Json;
using Avalonia.Controls;
using Avalonia.Threading;
using Nbl.Bridge;
using System.Reflection;
using Avalonia.Interactivity;
using System.Globalization;

namespace Nbl.Desktop;

public partial class MainWindow : Window
{
    // 在頁面載入後建立與 twa-pm-bridge.js 相容的 port（只需 postMessage / onmessage / start） 
    // 由於 window.__NBL_TWA_BRIDGE__ 可能尚未初始化，可能若它還沒出現，得設定 setTimeout 來延遲設置 port，以確保 bridge 能正確連接
    // 例如：
    // setTimeout(function() {
    //     if (window.__NBL_TWA_BRIDGE__) window.__NBL_TWA_BRIDGE__.setPort(port);
    // }, 100);
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
          // 若 bridge 尚未初始化，延遲設置 port
          var v = setInterval(function() {
              if (window.__NBL_TWA_BRIDGE__) {
                window.__NBL_TWA_BRIDGE__.setPort(port);
                console.log("Bridge port set via shim.");
                clearInterval(v);
              }
              console.log("Waiting for bridge to initialize...");
          }, 300);
          var b = window.__NBL_TWA_BRIDGE__;
          console.log("Bridge object (Shim):", b);
          if (b) b.setPort(port);
        })();
        """;

    private readonly OriginPolicy _origins;
    private readonly BridgeDispatcher _dispatcher;
    private readonly LocalStaticServer? _server;

    public MainWindow() : this(LaunchOptions.Parse(Array.Empty<string>()), null, null, null, null) { }

    private readonly IDesktopHost? _host;
    private readonly AlarmAudioManager? _audio;

    public bool AllowClose { get; set; }

    /// <summary>導覽到 PWA 內的網址（相同 origin 才允許）。</summary>
    public void NavigateTo(Uri uri)
    {
        if (_origins.IsAllowed(uri)) Web.Source = uri;
    }

    public MainWindow(LaunchOptions options, IDesktopHost? host, AlarmScheduler? alarms, TimerService? timers, AlarmAudioManager? audio)
    {
        _host = host;
        _audio = audio;
        InitializeComponent();
        ClockMenu.Header = L10n.ClockMenu;
        OpenClockMenuItem.Header = L10n.OpenClockMenuItem;
        StopSoundsMenuItem.Header = L10n.StopSoundsMenuItem;
        OpenSoundsFolderMenuItem.Header = L10n.OpenSoundsFolderMenuItem;
        ExitMenuItem.Header = L10n.ExitMenuItem;
        // TopMenuControl.IsVisible = App.IsFlatpak; //只有在 Flatpak 環境下才顯示頂部選單列

        String? version = Assembly.GetExecutingAssembly().GetName().Version?.ToString(3);
        Closing += (_, e) =>
        {
            if (AllowClose || host is null) return;
            e.Cancel = true;
            Hide();
        };
        _origins = new OriginPolicy(options.AllowedOrigins);
        _dispatcher = new BridgeDispatcher(OperatingSystem.IsLinux() ? "linux" : "windows", version ?? "0.1.0", new HttpIcsFetcher(), host, alarms, timers);

        if (options.Source == LoadSource.Dist)
        {
            _server = new LocalStaticServer(options.DistPath ?? FindDist(), options.LocalPort);
            _server.Start();
            Closed += (_, _) => _server.Dispose();
        }

        Web.EnvironmentRequested += (_, e) =>
        {
            // 1. 通用設定：如果是 Dev 模式，直接開啟跨平台的開發者工具通道
            if (options.Source == LoadSource.Dev)
            {
                e.EnableDevTools = true;
            }

            // 2. 針對不同平台進行細部環境變數或資料夾設定
            switch (e)
            {
                case Avalonia.Platform.WindowsWebView2EnvironmentRequestedEventArgs w:
                    w.UserDataFolder = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "NonBlockingLife", "WebView2");
                    // 讓 VSCode 的 msedge 配置可附加到此 WebView2 進行 PWA 除錯
                    if (options.Source == LoadSource.Dev)
                        w.AdditionalBrowserArguments = "--remote-debugging-port=9222";
                    break;
                // case Avalonia.Platform.MacOSWebViewEnvironmentRequestedEventArgs m:
                //     // macOS-specific environment setup can go here
                //     break;
                case Avalonia.Platform.GtkWebViewEnvironmentRequestedEventArgs l:

                    // 解析出 Linux 標準的本地應用程式資料路徑 (通常對應 ~/.local/share/)
                    var linuxAppData = Environment.GetFolderPath(
                        Environment.SpecialFolder.LocalApplicationData,
                        Environment.SpecialFolderOption.Create); // 自動建立

                    // 建立您的專屬資料夾路徑，例如 ~/.local/share/NonBlockingLife/GtkWebView
                    var linuxDataFolder = Path.Combine(linuxAppData, "NonBlockingLife", "GtkWebView");

                    // 建立以下三個 WebKit 專用的資料目錄
                    var dataDir = Path.Combine(linuxDataFolder, "Data");
                    var cacheDir = Path.Combine(linuxDataFolder, "Cache");

                    // 核心設定：指定 WebKitGtk 將所有 Cookie、IndexedDB (Dexie) 存到固定位置
                    l.BaseDataDirectory = dataDir;
                    l.BaseCacheDirectory = cacheDir;

                    // 確保沒有開啟不留痕跡（無痕）模式
                    l.EphemeralDataManager = false;
                    break;
            }

        };
        Web.NavigationStarted += (_, e) =>
        {
            var uri = e.Request;
            if (uri is not null)
            {
                if (uri.Scheme == ProtocolUri.Scheme)
                {
                    // 第一種 show-clock，沒參數
                    if (uri.Authority == "show-clock")
                    {
                        e.Cancel = true;
                        host?.ShowClockWindow(1);
                    }
                    else if (uri.Authority == "set-timer")
                    {
                        e.Cancel = true;
                        // 解析 `nonblockinglife://set-timer?duration=${durationSeconds}&skipUi=true&title=${encodeURIComponent(normalizedTitle)}` 然後在 timer 新增一條
                        timers?.AddFromUri(uri, DateTime.Now, host);
                    }

                }
                else if (!_origins.IsAllowed(uri))
                {
                    e.Cancel = true;
                    if (ExternalUriPolicy.IsSafe(uri))
                        Process.Start(new ProcessStartInfo(uri.ToString()) { UseShellExecute = true });
                    else
                        Trace.WriteLine($"[nbl] blocked navigation to {uri}");
                }
            }
        };
        Web.NavigationCompleted += async (_, _) =>
        {
            if (_origins.IsAllowed(Web.Source ?? new Uri("about:blank")))
            {
                if (App.IsFlatpak) await Web.InvokeScript("window.isFlatpak = true;");
                await Web.InvokeScript(Shim);
            }
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

    private void OnOpenClockWindow(object? sender, RoutedEventArgs e)
    {
        _host?.ShowClockWindow(1);
    }

    private void OnStopSounds(object? sender, RoutedEventArgs e)
    {
        // 停止音效的邏輯
        _audio?.StopAll();
    }

    private void OnOpenSoundsFolder(object? sender, RoutedEventArgs e)
    {
        try { SoundLibrary.OpenFolder(); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.ComponentModel.Win32Exception)
        {
            System.Diagnostics.Trace.WriteLine($"[nbl] open sounds folder failed: {ex.Message}");
        }
    }

    private void OnExitApp(object? sender, RoutedEventArgs e)
    {
        // 允許關閉所有視窗並結束行程
        AllowClose = true;

        // 如果有其他視窗（例如 ClockWindow），也要一併允許關閉
        // 或者直接強行關閉整個應用程式
        foreach (var window in Avalonia.Application.Current?.ApplicationLifetime is Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime desktop ? desktop.Windows : Array.Empty<Window>())
        {
            if (window is MainWindow mw) mw.AllowClose = true;
            if (window is ClockWindow cw) cw.AllowClose = true;
            window.Close();
        }

        // 終止整個桌面行程
        if (Avalonia.Application.Current?.ApplicationLifetime is Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime appLifetime)
        {
            appLifetime.Shutdown();
        }
    }
}
