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
    private WindowsPowerManager? _powerManager;

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
            if (StoreStartup.LaunchedByStartupTask()) options = options with { Background = true };
            var dataDir = DataPaths.Root;
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

            _powerManager = new WindowsPowerManager(
                () => CheckAlarmsAndTimers(alarms, timers, host, afterResume: true));
            desktop.Exit += (_, _) =>
            {
                _alarmTimer?.Stop();
                _powerManager?.Dispose();
                _powerManager = null;
            };

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
            IsEnabled = StoreStartup.IsAvailable || AutoStart.IsSupported,
        };
        if (StoreStartup.IsAvailable)
        {
            _ = Dispatcher.UIThread.InvokeAsync(async () =>
            {
                try { autoStart.IsChecked = await StoreStartup.IsEnabledAsync(); }
                catch (Exception e) { System.Diagnostics.Trace.WriteLine($"[nbl] startup task query failed: {e.Message}"); }
            });
            autoStart.Click += async (_, _) =>
            {
                var want = autoStart.IsChecked;
                try { autoStart.IsChecked = await StoreStartup.SetEnabledAsync(want); }
                catch (Exception e)
                {
                    System.Diagnostics.Trace.WriteLine($"[nbl] startup task failed: {e.Message}");
                    autoStart.IsChecked = !want;
                }
                if (autoStart.IsChecked != want)
                    host.ShowNotification(new ToastOptions { Title = "NonBlockingLife", Body = L10n.CannotSetAutoStart, IsAlarm = false });
            };
        }
        else
        {
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
        }
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

        var menu = new NativeMenu { open, clock, stopSounds, openSounds, autoStart };
        // Store 版的協定由 manifest 宣告，不需要也不能由程式註冊
        if (!PackageIdentity.IsPackaged) menu.Add(protocol);
        menu.Add(new NativeMenuItemSeparator());
        menu.Add(exit);

        var tray = new TrayIcon
        {
            Icon = new WindowIcon(AssetLoader.Open(new Uri("avares://Nbl.Desktop/Assets/icon.png"))),
            ToolTipText = "NonBlockingLife",
            Menu = menu,
        };
        tray.Clicked += (_, _) => host.ShowMainWindow();
        TrayIcon.SetIcons(this, new TrayIcons { tray });
    }

    private void StartAlarmTimer(AlarmScheduler alarms, TimerService timers, DesktopHost host)
    {
        _alarmTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _alarmTimer.Tick += (_, _) => CheckAlarmsAndTimers(alarms, timers, host);
        _alarmTimer.Start();
        CheckAlarmsAndTimers(alarms, timers, host);
    }

    private void CheckAlarmsAndTimers(
        AlarmScheduler alarms,
        TimerService timers,
        DesktopHost host,
        bool afterResume = false)
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

        if (afterResume)
            _audio.Refresh();

        var keepSystemAwake = _audio.IsRinging
            || timers.Snapshot().Any(t =>
                t.State == TimerState.Running && t.EndAt is { } endAt && endAt > now);
        _powerManager?.SetSystemRequired(keepSystemAwake, force: afterResume);
    }
}
