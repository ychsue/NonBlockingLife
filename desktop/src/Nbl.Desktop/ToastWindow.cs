using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Threading;
using Nbl.Bridge;

namespace Nbl.Desktop;

public sealed class ToastWindow : Window
{
    private const double ToastWidth = 320;
    private const double ToastHeight = 116; // 稍微增加高度以容納 ProgressBar

    // 用 ID 追蹤目前開啟的 Toast，以利「相同 ID 直接替換」
    private static readonly Dictionary<string, ToastWindow> ActiveToasts = new();
    private static readonly List<ToastWindow> OpenList = new();

    private readonly DispatcherTimer _timer;
    private readonly ProgressBar _progressBar;
    private readonly TextBlock _timeText;
    private readonly bool _clickToClose;
    private TimeSpan _remainingTime;
    private readonly TimeSpan _totalTime;
    private readonly bool _hasDuration;

    public string ToastId { get; }

    public static void Show(ToastOptions options)
    {
        // 實作：若有相同 ID，就先關閉原本的 Toast
        Dispatcher.UIThread.Post(() =>
        {
            if (ActiveToasts.TryGetValue(options.Id, out var existing))
            {
                existing.Close();
            }

            var window = new ToastWindow(options);
            ActiveToasts[options.Id] = window;
            window.Show();
        });
    }

    private ToastWindow(ToastOptions options)
    {
        ToastId = options.Id;
        _clickToClose = options.ClickToClose;
        Width = ToastWidth;
        Height = ToastHeight;
        CanResize = false;
        ShowInTaskbar = false;
        ShowActivated = false;
        Topmost = true;
        WindowDecorations = WindowDecorations.None;

        _hasDuration = options.Duration.HasValue && options.Duration.Value.TotalSeconds > 0;
        _totalTime = options.Duration ?? TimeSpan.FromSeconds(options.IsAlarm ? 300 : 8);
        _remainingTime = _totalTime;

        // 關閉按鈕
        var closeButton = new Button
        {
            Content = "✕",
            Background = Brushes.Transparent,
            Foreground = Brushes.WhiteSmoke,
            FontSize = 12,
            Padding = new Thickness(4),
            HorizontalAlignment = HorizontalAlignment.Right,
            VerticalAlignment = VerticalAlignment.Top
        };
        closeButton.Click += (_, _) => Close();

        // 剩餘時間顯示
        _timeText = new TextBlock
        {
            Foreground = Brushes.LightGray,
            FontSize = 11,
            Text = FormatTime(_remainingTime)
        };

        // 進度條
        _progressBar = new ProgressBar
        {
            Minimum = 0,
            Maximum = _totalTime.TotalSeconds,
            Value = _remainingTime.TotalSeconds,
            Height = 4,
            Foreground = new SolidColorBrush(Color.Parse("#4CAF50")) // 正常綠色/主題色
        };


        // 主要內容排版
        var mainContent = new StackPanel
        {
            Spacing = 4,
            VerticalAlignment = VerticalAlignment.Center
        };

        mainContent.Children.Add(new TextBlock { Text = options.Title, FontWeight = FontWeight.Bold, Foreground = Brushes.White, TextTrimming = TextTrimming.CharacterEllipsis });
        mainContent.Children.Add(new TextBlock { Text = options.Body, Foreground = Brushes.WhiteSmoke, TextWrapping = TextWrapping.Wrap, MaxLines = 2 });
        if (_hasDuration)
        {
            mainContent.Children.Add(new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Spacing = 8,
                Children = { _timeText }
            });
            mainContent.Children.Add(_progressBar);
        }

        Content = new Border
        {
            Background = new SolidColorBrush(Color.Parse(options.IsAlarm ? "#7A3E00" : "#2B2B2B")),
            BorderBrush = new SolidColorBrush(Color.Parse(options.IsAlarm ? "#FFB347" : "#555555")),
            BorderThickness = new Thickness(1),
            Padding = new Thickness(12),
            Child = new Grid
            {
                Children =
                {
                    // 右上角關閉按鈕
                    closeButton,
                    // 主要內容排版
                    mainContent
                }
            }
        };

        // 點擊事件：只執行 onClick，**不**自動關閉視窗
        PointerPressed += (_, _) =>
        {
            if (_clickToClose) Close();
            options.OnClick?.Invoke();
        };

        Opened += (_, _) => Reposition();
        Closed += (_, _) =>
        {
            ActiveToasts.Remove(ToastId);
            OpenList.Remove(this);
            foreach (var t in OpenList.ToArray()) t.Reposition();
        };

        // 每秒更新計時器
        _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _timer.Tick += (_, _) =>
        {
            _remainingTime = _remainingTime.Subtract(TimeSpan.FromSeconds(1));
            UpdateProgressUI();
            if (_remainingTime.TotalSeconds <= 0)
            {
                // Content 的 Background 變成紅色與 #2B2B2B 交替顯現的警告，就以 round(_remainingTime.TotalSeconds) 為奇數或偶數來切換
                if (Content is Border border)
                {
                    if (Math.Floor(Math.Abs(_remainingTime.TotalSeconds)) % 2 == 0)
                        border.Background = new SolidColorBrush(Color.Parse("#7A0000"));
                    else
                        border.Background = new SolidColorBrush(Color.Parse("#2B2B2B"));
                }
            }
        };
        _timer.Start();

        OpenList.Add(this);
    }

    private void UpdateProgressUI()
    {
        _timeText.Text = FormatTime(_remainingTime);

        if (_remainingTime.TotalSeconds >= 0)
        {
            _progressBar.Value = _remainingTime.TotalSeconds;
            _progressBar.Foreground = new SolidColorBrush(Color.Parse("#4CAF50")); // 正常
        }
        else
        {
            // 時間用完變成負數：進度條滿載並轉為紅色（超過一倍或更多依比例處理）
            _progressBar.Value = _progressBar.Maximum;
            _progressBar.Foreground = new SolidColorBrush(Color.Parse("#E53935")); // 紅色警告
            _timeText.Foreground = new SolidColorBrush(Color.Parse("#FF8A80"));
        }
    }

    private static string FormatTime(TimeSpan span)
    {
        if (span.TotalSeconds < 0)
        {
            var abs = span.Negate();
            return $"-{abs.Minutes:D2}:{abs.Seconds:D2} (逾時)";
        }
        return $"{span.Minutes:D2}:{span.Seconds:D2}";
    }

    private void Reposition()
    {
        var screen = Screens.Primary;
        if (screen is null) return;
        var wa = screen.WorkingArea;
        var scale = screen.Scaling;
        var index = OpenList.IndexOf(this);
        var x = wa.Right - (int)((ToastWidth + 12) * scale);
        var y = wa.Bottom - (int)((ToastHeight + 12) * scale * (index + 1));
        Position = new PixelPoint(x, Math.Max(wa.Y, y));
    }
}