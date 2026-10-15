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
    private ClockWindow? _clock;

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
            var timers = new TimerService(Path.Combine(dataDir, "timers.json"));
            _clock = new ClockWindow(alarms, timers);
            var host = new DesktopHost();
            var window = new MainWindow(options, host, alarms);
            host.Attach(window);
            desktop.MainWindow = window;

            var startAction = options.StartAction;
            if (options.Background || startAction?.Kind == ProtocolActionKind.ShowClock)
            {
                void HideOnce(object? s, EventArgs e) { window.Opened -= HideOnce; window.Hide(); }
                window.Opened += HideOnce;
            }
            if (startAction?.Kind == ProtocolActionKind.ShowClock)
                Dispatcher.UIThread.Post(() => _clock.ShowAndActivate(1));
            if (Program.Instance is { } single)
                single.ShowRequested += payload => Dispatcher.UIThread.Post(() => HandleProtocol(payload, options, window, host));

            SetupTray(desktop, window, host);
            StartAlarmTimer(alarms, timers, host);
        }

        base.OnFrameworkInitializationCompleted();
    }

    private void HandleProtocol(string? payload, LaunchOptions options, MainWindow window, DesktopHost host)
    {
        System.Diagnostics.Trace.WriteLine($"[nbl] show requested: {payload}");
        var action = ProtocolUri.Resolve(payload, options.BaseUri);
        switch (action)
        {
            case { Kind: ProtocolActionKind.ShowClock }:
                _clock?.ShowAndActivate(1);
                break;
            case { Kind: ProtocolActionKind.Navigate, Target: { } target }:
                window.NavigateTo(target);
                host.ShowMainWindow();
                break;
            default:
                host.ShowMainWindow();
                break;
        }
    }

    private void SetupTray(IClassicDesktopStyleApplicationLifetime desktop, MainWindow window, DesktopHost host)
    {
        var open = new NativeMenuItem("開啟 NonBlockingLife");
        open.Click += (_, _) => host.ShowMainWindow();
        var clock = new NativeMenuItem("鬧鐘與計時器");
        clock.Click += (_, _) => _clock?.ShowAndActivate();
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
        var protocol = new NativeMenuItem("註冊 nonblockinglife:// 連結")
        {
            ToggleType = MenuItemToggleType.CheckBox,
            IsEnabled = ProtocolRegistration.IsSupported,
        };
        try { protocol.IsChecked = ProtocolRegistration.IsRegistered(); }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException) { }
        protocol.Click += (_, _) =>
        {
            try { ProtocolRegistration.SetRegistered(protocol.IsChecked); }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                protocol.IsChecked = !protocol.IsChecked;
                host.ShowNotification(0, "NonBlockingLife", "無法註冊 nonblockinglife:// 連結", isAlarm: false);
            }
        };
        var exit = new NativeMenuItem("結束");
        exit.Click += (_, _) =>
        {
            window.AllowClose = true;
            if (_clock is not null) _clock.AllowClose = true;
            _alarmTimer?.Stop();
            desktop.Shutdown();
        };

        var tray = new TrayIcon
        {
            Icon = new WindowIcon(AssetLoader.Open(new Uri("avares://Nbl.Desktop/Assets/icon.png"))),
            ToolTipText = "NonBlockingLife",
            Menu = new NativeMenu { open, clock, autoStart, protocol, new NativeMenuItemSeparator(), exit },
        };
        tray.Clicked += (_, _) => host.ShowMainWindow();
        TrayIcon.SetIcons(this, new TrayIcons { tray });
    }

    private void StartAlarmTimer(AlarmScheduler alarms, TimerService timers, DesktopHost host)
    {
        _alarmTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _alarmTimer.Tick += (_, _) =>
        {
            var now = DateTimeOffset.Now;
            foreach (var due in alarms.TakeDue(now))
                host.ShowNotification(due.Id ?? 0, "⏰ NonBlockingLife", due.Label, isAlarm: true);
            foreach (var t in timers.TakeFinished(now))
                host.ShowNotification(0, "⏳ 計時結束", t.Label, isAlarm: true);
        };
        _alarmTimer.Start();
    }
}
