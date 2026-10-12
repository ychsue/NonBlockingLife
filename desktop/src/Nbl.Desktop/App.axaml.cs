using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using Avalonia.Platform;
using Avalonia.Threading;
using Nbl.Bridge;

namespace Nbl.Desktop;

public partial class App : Application
{
    private DispatcherTimer? _alarmTimer;

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // 關閉視窗只是縮到系統匣；真正結束要從系統匣選單
            desktop.ShutdownMode = ShutdownMode.OnExplicitShutdown;

            var options = LaunchOptions.Parse(desktop.Args ?? Array.Empty<string>());
            var dataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NonBlockingLife");
            var alarms = new AlarmScheduler(Path.Combine(dataDir, "alarms.json"));
            var host = new DesktopHost();
            var window = new MainWindow(options, host, alarms);
            host.Attach(window);
            desktop.MainWindow = window;

            if (options.Background)
            {
                void HideOnce(object? s, EventArgs e) { window.Opened -= HideOnce; window.Hide(); }
                window.Opened += HideOnce;
            }
            if (Program.Instance is { } single)
                single.ShowRequested += () => { System.Diagnostics.Trace.WriteLine("[nbl] show requested"); host.ShowMainWindow(); };

            SetupTray(desktop, window, host);
            StartAlarmTimer(alarms, host);
        }

        base.OnFrameworkInitializationCompleted();
    }

    private void SetupTray(IClassicDesktopStyleApplicationLifetime desktop, MainWindow window, DesktopHost host)
    {
        var open = new NativeMenuItem("開啟 NonBlockingLife");
        open.Click += (_, _) => host.ShowMainWindow();
        var autoStart = new NativeMenuItem("開機時自動啟動")
        {
            ToggleType = MenuItemToggleType.CheckBox,
            IsEnabled = AutoStart.IsSupported,
        };
        try { autoStart.IsChecked = AutoStart.IsEnabled(); }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException) { }
        autoStart.Click += (_, _) =>
        {
            try { AutoStart.SetEnabled(autoStart.IsChecked); }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                autoStart.IsChecked = !autoStart.IsChecked;
                host.ShowNotification(0, "NonBlockingLife", "無法設定開機自動啟動", isAlarm: false);
            }
        };
        var exit = new NativeMenuItem("結束");
        exit.Click += (_, _) =>
        {
            window.AllowClose = true;
            _alarmTimer?.Stop();
            desktop.Shutdown();
        };

        var tray = new TrayIcon
        {
            Icon = new WindowIcon(AssetLoader.Open(new Uri("avares://Nbl.Desktop/Assets/icon.png"))),
            ToolTipText = "NonBlockingLife",
            Menu = new NativeMenu { open, autoStart, new NativeMenuItemSeparator(), exit },
        };
        tray.Clicked += (_, _) => host.ShowMainWindow();
        TrayIcon.SetIcons(this, new TrayIcons { tray });
    }

    private void StartAlarmTimer(AlarmScheduler alarms, DesktopHost host)
    {
        _alarmTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _alarmTimer.Tick += (_, _) =>
        {
            foreach (var due in alarms.TakeDue(DateTimeOffset.Now))
                host.ShowNotification(due.Id ?? 0, "⏰ NonBlockingLife", due.Label, isAlarm: true);
        };
        _alarmTimer.Start();
    }
}
