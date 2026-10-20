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
    private AlarmAudioManager _audio = new(new NullAudioPlayer());

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
            _audio = new AlarmAudioManager(AudioPlayerFactory.Create());
            _clock = new ClockWindow(alarms, timers, _audio);
            var host = new DesktopHost();
            host.BaseUri = options.BaseUri;
            var window = new MainWindow(options, host, alarms, timers);
            host.Attach(window, _clock);
            desktop.MainWindow = window;

            var startAction = options.StartAction;
            if (options.Background || startAction?.Kind == ProtocolActionKind.ShowClock)
            {
                void HideOnce(object? s, EventArgs e) { window.Opened -= HideOnce; window.Hide(); }
                window.Opened += HideOnce;
            }
            if (startAction?.Kind == ProtocolActionKind.ShowClock)
            {
                Dispatcher.UIThread.Post(() => _clock.ShowAndActivate(1));
            }
            else if (startAction?.Kind == ProtocolActionKind.SetTimer)
            {
                timers.AddFromUri(startAction.Target ?? new Uri("about:blank"), DateTime.Now, host);
            }
            if (Program.Instance is { } single)
                single.ShowRequested += payload => Dispatcher.UIThread.Post(() => HandleProtocol(payload, options, window, timers, host));

            SetupTray(desktop, window, host);
            StartAlarmTimer(alarms, timers, host);
        }

        base.OnFrameworkInitializationCompleted();
    }

    private void HandleProtocol(string? payload, LaunchOptions options, MainWindow window, TimerService timers, DesktopHost host)
    {
        System.Diagnostics.Trace.WriteLine($"[nbl] show requested: {payload}");
        var action = ProtocolUri.Resolve(payload, options.BaseUri);
        switch (action)
        {
            case { Kind: ProtocolActionKind.ShowClock }:
                _clock?.ShowAndActivate(1);
                break;
            case { Kind: ProtocolActionKind.SetTimer, Target: { } target }:
                // Handle set-timer action if needed
                timers?.AddFromUri(target, DateTime.Now, host);
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
        var open = new NativeMenuItem(L10n.Tray1Title);
        open.Click += (_, _) => host.ShowMainWindow();
        var clock = new NativeMenuItem(L10n.Tray2Title);
        clock.Click += (_, _) => _clock?.ShowAndActivate(0);
        var autoStart = new NativeMenuItem(L10n.Tray3Title)
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
                host.ShowNotification(new ToastOptions { Title = "NonBlockingLife", Body = L10n.CannotSetAutoStart, IsAlarm = false });
            }
        };
        var protocol = new NativeMenuItem(L10n.Tray4Title)
        {
            ToggleType = MenuItemToggleType.CheckBox,
            IsEnabled = ProtocolRegistration.IsSupported,
        };
        try { protocol.IsChecked = ProtocolRegistration.IsRegistered(); }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException) { }
        protocol.Click += (_, _) =>
        {
            try { 
                ProtocolRegistration.SetRegistered(!protocol.IsChecked); 
                protocol.IsChecked = !protocol.IsChecked;
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                protocol.IsChecked = !protocol.IsChecked;
                host.ShowNotification(new ToastOptions { Title = "NonBlockingLife", Body = L10n.CannotRegisterProtocol, IsAlarm = false });
            }
        };
        var stopSounds = new NativeMenuItem(L10n.TrayStopAlarmsTitle);
        stopSounds.Click += (_, _) => _audio.StopAll();
        var openSounds = new NativeMenuItem(L10n.TrayOpenSoundsTitle);
        openSounds.Click += (_, _) =>
        {
            try { SoundLibrary.OpenFolder(); }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException or System.ComponentModel.Win32Exception)
            {
                System.Diagnostics.Trace.WriteLine($"[nbl] open sounds folder failed: {e.Message}");
            }
        };
        var exit = new NativeMenuItem(L10n.TrayExitTitle);
        exit.Click += (_, _) =>
        {
            _audio.StopAll();
            window.AllowClose = true;
            if (_clock is not null) _clock.AllowClose = true;
            _alarmTimer?.Stop();
            desktop.Shutdown();
        };

        var tray = new TrayIcon
        {
            Icon = new WindowIcon(AssetLoader.Open(new Uri("avares://Nbl.Desktop/Assets/icon.png"))),
            ToolTipText = "NonBlockingLife",
            Menu = new NativeMenu { open, clock, stopSounds, openSounds, autoStart, protocol, new NativeMenuItemSeparator(), exit },
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
            {
                var key = "alarm:" + due.Key;
                _audio.Start(key, SoundLibrary.Resolve(due.Sound));
                host.ShowNotification(new ToastOptions { Title = "⏰ NonBlockingLife", Body = due.Label, IsAlarm = true, OnClosed = () => _audio.Stop(key) });
            }
            foreach (var t in timers.TakeFinished(now))
            {
                var key = "timer:" + t.Id;
                _audio.Start(key, SoundLibrary.Resolve(t.Sound));
                host.ShowNotification(new ToastOptions { Title = "⏳ " + L10n.TimerFinished, Body = t.Label, IsAlarm = true, OnClosed = () => _audio.Stop(key) });
            }
        };
        _alarmTimer.Start();
    }
}
