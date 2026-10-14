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
    private readonly StackPanel _alarmList = new() { Spacing = 6 };
    private readonly StackPanel _timerList = new() { Spacing = 6 };
    private readonly Dictionary<string, TextBlock> _remainingTexts = new();
    private readonly DispatcherTimer _tick = new() { Interval = TimeSpan.FromMilliseconds(500) };
    private string _alarmSig = "";
    private string _timerSig = "";

    public bool AllowClose { get; set; }

    public ClockWindow(AlarmScheduler alarms, TimerService timers)
    {
        _alarms = alarms;
        _timers = timers;
        Title = "NonBlockingLife — 鬧鐘與計時器";
        Width = 480;
        Height = 520;
        MinWidth = 420;

        Content = new TabControl
        {
            Items =
            {
                new TabItem { Header = "鬧鐘", Content = BuildAlarmTab() },
                new TabItem { Header = "計時器", Content = BuildTimerTab() },
            },
        };

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

    public void ShowAndActivate()
    {
        Show();
        if (WindowState == WindowState.Minimized) WindowState = WindowState.Normal;
        Activate();
    }

    private Control BuildAlarmTab()
    {
        var hour = Num(0, 23, DateTime.Now.Hour);
        var minute = Num(0, 59, DateTime.Now.Minute);
        var label = new TextBox { PlaceholderText = "標籤", MinWidth = 120, HorizontalAlignment = HorizontalAlignment.Stretch };
        var add = new Button { Content = "新增鬧鐘" };
        add.Click += (_, _) =>
        {
            var item = new JsonObject
            {
                ["mode"] = "clock",
                ["time"] = new JsonArray((int)hour.Value!, (int)minute.Value!),
                ["label"] = string.IsNullOrWhiteSpace(label.Text) ? "鬧鐘" : label.Text,
            };
            _alarms.Set(new JsonArray(item), DateTimeOffset.Now);
            label.Text = "";
            Refresh();
        };

        return Page(
            new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Spacing = 6,
                Children = { hour, new TextBlock { Text = ":", VerticalAlignment = VerticalAlignment.Center }, minute, label, add },
            },
            _alarmList);
    }

    private Control BuildTimerTab()
    {
        var hour = Num(0, 99, 0);
        var minute = Num(0, 59, 5);
        var second = Num(0, 59, 0);
        var label = new TextBox { PlaceholderText = "標籤", MinWidth = 100 };
        var add = new Button { Content = "新增並開始" };
        add.Click += (_, _) =>
        {
            var d = new TimeSpan((int)hour.Value!, (int)minute.Value!, (int)second.Value!);
            _timers.Create(d, string.IsNullOrWhiteSpace(label.Text) ? "計時器" : label.Text, DateTimeOffset.Now);
            label.Text = "";
            Refresh();
        };

        return Page(
            new WrapPanel
            {
                Children =
                {
                    hour, new TextBlock { Text = "時", VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0) },
                    minute, new TextBlock { Text = "分", VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0) },
                    second, new TextBlock { Text = "秒", VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0) },
                    label, add,
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
        var sig = string.Join("|", alarms.Select(a => $"{a.Key}@{a.FireAt.ToUnixTimeSeconds()}"));
        if (sig == _alarmSig) return;
        _alarmSig = sig;
        _alarmList.Children.Clear();
        if (alarms.Count == 0)
            _alarmList.Children.Add(new TextBlock { Text = "目前沒有鬧鐘", Opacity = 0.6 });
        foreach (var a in alarms)
        {
            var del = new Button { Content = "刪除" };
            var key = a.Key;
            del.Click += (_, _) => { _alarms.Remove(key); Refresh(); };
            _alarmList.Children.Add(Row(
                new StackPanel
                {
                    Children =
                    {
                        new TextBlock { Text = a.FireAt.ToLocalTime().ToString("MM/dd HH:mm"), FontSize = 20 },
                        new TextBlock { Text = a.Label, Opacity = 0.7 },
                    },
                },
                del));
        }
    }

    private void RefreshTimers(DateTimeOffset now)
    {
        var timers = _timers.Snapshot();
        var sig = string.Join("|", timers.Select(t => $"{t.Id}:{t.State}:{t.Duration.Ticks}:{t.EndAt?.ToUnixTimeSeconds()}"));
        if (sig != _timerSig)
        {
            _timerSig = sig;
            _timerList.Children.Clear();
            _remainingTexts.Clear();
            if (timers.Count == 0)
                _timerList.Children.Add(new TextBlock { Text = "目前沒有計時器", Opacity = 0.6 });
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

        var toggle = new Button { Content = t.State == TimerState.Running ? "暫停" : t.State == TimerState.Paused ? "繼續" : "開始" };
        toggle.Click += (_, _) =>
        {
            if (t.State == TimerState.Running) _timers.Pause(id, DateTimeOffset.Now);
            else _timers.Start(id, DateTimeOffset.Now);
            Refresh();
        };
        var reset = new Button { Content = "重置" };
        reset.Click += (_, _) => { _timers.Reset(id); Refresh(); };
        var plus = new Button { Content = "+1:00" };
        plus.Click += (_, _) => { _timers.AddMinute(id, DateTimeOffset.Now); Refresh(); };
        var del = new Button { Content = "刪除" };
        del.Click += (_, _) => { _timers.Remove(id); Refresh(); };

        return Row(
            new StackPanel
            {
                Children = { remaining, new TextBlock { Text = $"{t.Label}（{Format(t.Duration)}）", Opacity = 0.7 } },
            },
            new StackPanel { Orientation = Orientation.Horizontal, Spacing = 4, Children = { toggle, reset, plus, del } });
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
