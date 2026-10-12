using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Threading;

namespace Nbl.Desktop;

/// <summary>右下角的小提示視窗；主視窗縮到系統匣時仍能顯示通知與鬧鐘。</summary>
public sealed class ToastWindow : Window
{
    private const double ToastWidth = 320;
    private const double ToastHeight = 96;
    private static readonly List<ToastWindow> Open = new();

    public ToastWindow(string title, string body, bool isAlarm, Action onClick)
    {
        Width = ToastWidth;
        Height = ToastHeight;
        CanResize = false;
        ShowInTaskbar = false;
        ShowActivated = false;
        Topmost = true;
        WindowDecorations = WindowDecorations.None;

        Content = new Border
        {
            Background = new SolidColorBrush(Color.Parse(isAlarm ? "#7A3E00" : "#2B2B2B")),
            BorderBrush = new SolidColorBrush(Color.Parse(isAlarm ? "#FFB347" : "#555555")),
            BorderThickness = new Thickness(1),
            Padding = new Thickness(12),
            Child = new StackPanel
            {
                Spacing = 4,
                VerticalAlignment = VerticalAlignment.Center,
                Children =
                {
                    new TextBlock { Text = title, FontWeight = FontWeight.Bold, Foreground = Brushes.White, TextTrimming = TextTrimming.CharacterEllipsis },
                    new TextBlock { Text = body, Foreground = Brushes.WhiteSmoke, TextWrapping = TextWrapping.Wrap, MaxLines = 3 },
                },
            },
        };

        PointerPressed += (_, _) =>
        {
            Close();
            onClick();
        };
        Opened += (_, _) => Reposition();
        Closed += (_, _) =>
        {
            Open.Remove(this);
            foreach (var t in Open.ToArray()) t.Reposition();
        };

        // 一般通知自動消失；鬧鐘需要使用者點擊才關閉（最長 5 分鐘）
        var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(isAlarm ? 300 : 8) };
        timer.Tick += (_, _) =>
        {
            timer.Stop();
            Close();
        };
        timer.Start();
        Open.Add(this);
    }

    private void Reposition()
    {
        var screen = Screens.Primary;
        if (screen is null) return;
        var wa = screen.WorkingArea;
        var scale = screen.Scaling;
        var index = Open.IndexOf(this);
        var x = wa.Right - (int)((ToastWidth + 12) * scale);
        var y = wa.Bottom - (int)((ToastHeight + 12) * scale * (index + 1));
        Position = new PixelPoint(x, Math.Max(wa.Y, y));
    }
}
