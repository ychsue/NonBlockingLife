using System.Diagnostics;
using Avalonia.Controls;
using Avalonia.Input.Platform;
using Avalonia.Threading;
using Nbl.Bridge;

namespace Nbl.Desktop;

public sealed class DesktopHost : IDesktopHost
{
    private Window? _main;
    private ClockWindow? _clock;

    public void Attach(Window main, ClockWindow clock) => (_main, _clock) = (main, clock);

    public void ShowMainWindow()
    {
        Dispatcher.UIThread.Post(() =>
        {
            if (_main is null) return;
            _main.Show();
            if (_main.WindowState == WindowState.Minimized) _main.WindowState = WindowState.Normal;
            _main.Activate();
        });
    }

    public void ShowClockWindow(int tabIndex = 0)
    {
        Dispatcher.UIThread.Post(() =>
        {
            if (_clock is null) return;
            _clock.ShowAndActivate(tabIndex);
        });
    }

    public void ShowNotification(int id, string title, string body, bool isAlarm) =>
        Dispatcher.UIThread.Post(() => new ToastWindow(title, body, isAlarm, ShowMainWindow).Show());

    public void OpenExternal(Uri url) =>
        Process.Start(new ProcessStartInfo(url.ToString()) { UseShellExecute = true });

    public void Share(string title, string text) =>
        Dispatcher.UIThread.Post(async () =>
        {
            var clipboard = _main is null ? null : TopLevel.GetTopLevel(_main)?.Clipboard;
            if (clipboard is null) return;
            await clipboard.SetTextAsync(string.IsNullOrEmpty(title) ? text : $"{title}\n{text}");
            ShowNotification(0, "NonBlockingLife", "已複製到剪貼簿", isAlarm: false);
        });
}
