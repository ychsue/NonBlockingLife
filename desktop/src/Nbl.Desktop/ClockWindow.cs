using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.Threading;
using Nbl.Bridge;
using System.Text.Json.Nodes;

namespace Nbl.Desktop;

/// <summary>小型時鐘視窗：管理鬧鐘與計時器（開始／暫停／繼續／重置／+1:00／刪除）。資料與 PWA 共用同一份。</summary>
public sealed class ClockWindow : Window
{
    private readonly AlarmScheduler _alarms;
    private readonly TimerService _timers;
    private readonly AlarmAudioManager? _audio;
    private readonly StackPanel _alarmList = new() { Spacing = 6 };
    private readonly StackPanel _timerList = new() { Spacing = 6 };
    private readonly Dictionary<string, TextBlock> _remainingTexts = new();
    private readonly DispatcherTimer _tick = new() { Interval = TimeSpan.FromMilliseconds(500) };
    private string _alarmSig = "";
    private string _timerSig = "";

    private readonly TabControl _tabControl;

    public bool AllowClose { get; set; }

    public ClockWindow(AlarmScheduler alarms, TimerService timers, AlarmAudioManager? audio = null)
    {
        _alarms = alarms;
        _timers = timers;
        _audio = audio;
        Title = "NonBlockingLife — " + L10n.Tray2Title;
        Width = 480;
        Height = 520;
        MinWidth = 420;

        _tabControl = new TabControl
        {
            Items =
            {
                new TabItem { Header = L10n.CW_Alarm, Content = BuildAlarmTab() },
                new TabItem { Header = L10n.CW_Timer, Content = BuildTimerTab() },
            },
        };
        Content = _tabControl;

        Closing += (_, e) =>
        {
            if (AllowClose) return;
            e.Cancel = true;
            Hide();
        };
        _tick.Tick += (_, _) => Refresh();
        Opened += (_, _) => { Refresh(); _tick.Start(); };
        PropertyChanged += (_, e) =>
        {
            if (e.Property == IsVisibleProperty) { if (IsVisible) { Refresh(); _tick.Start(); } else _tick.Stop(); }
        };
    }

    public void ShowAndActivate(int tabIndex = 0)
    {
        if (_tabControl.SelectedIndex != tabIndex) _tabControl.SelectedIndex = tabIndex;

        Show();
        if (WindowState == WindowState.Minimized) WindowState = WindowState.Normal;
        Activate();
    }

    private Control BuildAlarmTab()
    {
        var hour = Num(0, 23, DateTime.Now.Hour);
        var minute = Num(0, 59, DateTime.Now.Minute);
        var label = new TextBox { PlaceholderText = L10n.CW_NewAlarmLabel, MinWidth = 120, HorizontalAlignment = HorizontalAlignment.Stretch };
        var sound = BuildSoundPicker();
        var add = new Button { Content = L10n.CW_AddAlarm };
        add.Click += (_, _) =>
        {
            var item = new JsonObject
            {
                ["mode"] = "clock",
                ["time"] = new JsonArray((int)hour.Value!, (int)minute.Value!),
                ["label"] = string.IsNullOrWhiteSpace(label.Text) ? L10n.CW_Alarm : label.Text,
                ["sound"] = SelectedSound(sound),
            };
            _alarms.Set(new JsonArray(item), DateTimeOffset.Now);
            label.Text = "";
            Refresh();
        };

        return Page(
            new WrapPanel
            {
                Children = { hour, new TextBlock { Text = ":", VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0) }, minute, label, sound, add },
            },
            _alarmList);
    }

    // 第 0 項是「預設鈴聲」（Sound = null）；其餘為 sounds 目錄中的檔名。展開時重新掃描，新增檔案不用重啟。
    private static ComboBox BuildSoundPicker()
    {
        var combo = new ComboBox { MinWidth = 130 };
        void Fill()
        {
            var current = SelectedSound(combo);
            combo.Items.Clear();
            combo.Items.Add(L10n.CW_DefaultSound);
            foreach (var s in SoundLibrary.List()) combo.Items.Add(s);
            var idx = current is null ? 0 : combo.Items.IndexOf(current);
            combo.SelectedIndex = idx < 0 ? 0 : idx;
        }
        Fill();
        combo.DropDownOpened += (_, _) => Fill();
        return combo;
    }

    private static string? SelectedSound(ComboBox combo) =>
        combo.SelectedIndex > 0 ? combo.SelectedItem as string : null;

    private Control BuildTimerTab()
    {
        var hour = Num(0, 99, 0);
        var minute = Num(0, 59, 5);
        var second = Num(0, 59, 0);
        var label = new TextBox { PlaceholderText = L10n.CW_NewTimerLabel, MinWidth = 100 };
        var sound = BuildSoundPicker();
        var add = new Button { Content = L10n.CW_AddTimer };
        add.Click += (_, _) =>
        {
            var d = new TimeSpan((int)hour.Value!, (int)minute.Value!, (int)second.Value!);
            _timers.Create(d, string.IsNullOrWhiteSpace(label.Text) ? L10n.CW_Timer : label.Text, DateTimeOffset.Now, sound: SelectedSound(sound));
            label.Text = "";
            Refresh();
        };

        return Page(
            new WrapPanel
            {
                Children =
                {
                    hour, new TextBlock { Text = L10n.Hour, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0) },
                    minute, new TextBlock { Text = L10n.Minute, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0) },
                    second, new TextBlock { Text = L10n.Second, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0) },
                    label, sound, add,
                },
            },
            _timerList);
    }

    private static Control Page(Control header, Control list) => new DockPanel
    {
        Margin = new Thickness(12),
        LastChildFill = true,
        Children =
        {
            Dock(header, Avalonia.Controls.Dock.Top),
            new ScrollViewer { Margin = new Thickness(0, 12, 0, 0), Content = list },
        },
    };

    private static Control Dock(Control c, Dock d)
    {
        DockPanel.SetDock(c, d);
        return c;
    }

    private static NumericUpDown Num(int min, int max, int value) => new()
    {
        Minimum = min,
        Maximum = max,
        Value = value,
        Increment = 1,
        FormatString = "0",
        Width = 110,
    };

    private void Refresh()
    {
        var now = DateTimeOffset.Now;
        RefreshAlarms();
        RefreshTimers(now);
    }

    private void RefreshAlarms()
    {
        var alarms = _alarms.Snapshot();
        var sig = string.Join("|", alarms.Select(a => $"{a.Key}@{a.FireAt.ToUnixTimeSeconds()}:{a.Sound}"));
        if (sig == _alarmSig) return;
        _alarmSig = sig;
        _alarmList.Children.Clear();
        if (alarms.Count == 0)
            _alarmList.Children.Add(new TextBlock { Text = L10n.CW_NoAlarm, Opacity = 0.6 });
        foreach (var a in alarms)
        {
            var del = new Button { Content = L10n.Delete };
            var key = a.Key;
            del.Click += (_, _) => { _audio?.Stop("alarm:" + key); _alarms.Remove(key); Refresh(); };
            var pick = BuildSoundButton(a.Sound, s => { _alarms.SetSound(key, s); Refresh(); });
            _alarmList.Children.Add(Row(
                new StackPanel
                {
                    Children =
                    {
                        new TextBlock { Text = a.FireAt.ToLocalTime().ToString("MM/dd HH:mm"), FontSize = 20 },
                        new TextBlock { Text = a.Label, Opacity = 0.7 },
                        SoundCaption(a.Sound),
                    },
                },
                new StackPanel { Orientation = Orientation.Horizontal, Spacing = 4, Children = { pick, del } }));
        }
    }

    private void RefreshTimers(DateTimeOffset now)
    {
        var timers = _timers.Snapshot();
        var sig = string.Join("|", timers.Select(t => $"{t.Id}:{t.State}:{t.Duration.Ticks}:{t.EndAt?.ToUnixTimeSeconds()}:{t.Sound}"));
        if (sig != _timerSig)
        {
            _timerSig = sig;
            _timerList.Children.Clear();
            _remainingTexts.Clear();
            if (timers.Count == 0)
                _timerList.Children.Add(new TextBlock { Text = L10n.CW_NoTimer, Opacity = 0.6 });
            foreach (var t in timers) _timerList.Children.Add(BuildTimerRow(t));
        }
        foreach (var t in timers)
            if (_remainingTexts.TryGetValue(t.Id, out var tb)) tb.Text = Format(t.RemainingAt(now));
    }

    private Control BuildTimerRow(TimerEntry t)
    {
        var id = t.Id;
        var remaining = new TextBlock { FontSize = 28 };
        _remainingTexts[id] = remaining;

        var toggle = new Button { Content = t.State == TimerState.Running ? L10n.Pause : t.State == TimerState.Paused ? L10n.Resume : L10n.Start };
        toggle.Click += (_, _) =>
        {
            _audio?.Stop("timer:" + id);
            if (t.State == TimerState.Running) _timers.Pause(id, DateTimeOffset.Now);
            else _timers.Start(id, DateTimeOffset.Now);
            Refresh();
        };
        var reset = new Button { Content = L10n.Reset };
        reset.Click += (_, _) => { _audio?.Stop("timer:" + id); _timers.Reset(id); Refresh(); };
        var plus = new Button { Content = "+1:00" };
        plus.Click += (_, _) => { _timers.AddMinute(id, DateTimeOffset.Now); Refresh(); };
        var del = new Button { Content = L10n.Delete };
        del.Click += (_, _) => { _audio?.Stop("timer:" + id); _timers.Remove(id); Refresh(); };

        var pick = BuildSoundButton(t.Sound, s => { _timers.SetSound(id, s); Refresh(); });

        return Row(
            new StackPanel
            {
                Children = { remaining, new TextBlock { Text = $"{t.Label}（{Format(t.Duration)}）", Opacity = 0.7 }, SoundCaption(t.Sound) },
            },
            new StackPanel { Orientation = Orientation.Horizontal, Spacing = 4, Children = { toggle, reset, plus, pick, del } });
    }

    private static TextBlock SoundCaption(string? sound) => new()
    {
        Text = "🎶 " + (SoundLibrary.Resolve(sound) is null ? L10n.CW_DefaultSound : sound),
        Opacity = 0.5,
        FontSize = 12,
    };

    // 🎶 按鈕：點開選單選鈴聲。每次點擊都重新掃描 sounds 目錄並建立新的選單；目前選中的項目前面打勾。
    private static Button BuildSoundButton(string? current, Action<string?> apply)
    {
        var button = new Button { Content = "🎶" };
        button.Click += (_, _) =>
        {
            var menu = new MenuFlyout();
            var selected = SoundLibrary.Resolve(current) is null ? null : current;
            void Add(string header, string? value)
            {
                var item = new MenuItem { Header = (value == selected ? "✓ " : "    ") + header };
                item.Click += (_, _) => apply(value);
                menu.Items.Add(item);
            }
            Add(L10n.CW_DefaultSound, null);
            foreach (var s in SoundLibrary.List()) Add(s, s);
            menu.ShowAt(button);
        };
        return button;
    }

    private static Control Row(Control left, Control right)
    {
        var grid = new Grid { ColumnDefinitions = new ColumnDefinitions("*,Auto") };
        Grid.SetColumn(right, 1);
        right.VerticalAlignment = VerticalAlignment.Center;
        grid.Children.Add(left);
        grid.Children.Add(right);
        return new Border
        {
            BorderBrush = Avalonia.Media.Brushes.Gray,
            BorderThickness = new Thickness(0, 0, 0, 1),
            Padding = new Thickness(0, 6),
            Child = grid,
        };
    }

    // 剩餘時間無條件進位到秒，避免 00:00 還沒響
    private static string Format(TimeSpan t)
    {
        var s = (long)Math.Ceiling(t.TotalSeconds);
        return s >= 3600 ? $"{s / 3600}:{s % 3600 / 60:00}:{s % 60:00}" : $"{s / 60:00}:{s % 60:00}";
    }
}
