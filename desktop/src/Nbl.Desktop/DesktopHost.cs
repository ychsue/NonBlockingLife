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

    public Uri? BaseUri { get; set; }

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

    public void ShowNotification(ToastOptions options)
    {
        if (options.OnClick == null)
        {
            if (options.IsAlarm)
                options.OnClick = () => ShowClockWindow(1);
            else
                options.OnClick = ShowMainWindow;
        }
        ToastWindow.Show(options);
    }

    public void OpenExternal(Uri url) =>
        Process.Start(new ProcessStartInfo(url.ToString()) { UseShellExecute = true });

    public void Share(string title, string text) =>
        Dispatcher.UIThread.Post(async () =>
        {
            var clipboard = _main is null ? null : TopLevel.GetTopLevel(_main)?.Clipboard;
            if (clipboard is null) return;
            await clipboard.SetTextAsync(string.IsNullOrEmpty(title) ? text : $"{title}\n{text}");
            ShowNotification(new ToastOptions { Title = "NonBlockingLife", Body = L10n.CopiedToClipboard, IsAlarm = false, OnClick = ShowMainWindow });
        });

    public void OpenSoundsFolder()
    {
        Dispatcher.UIThread.Post(() =>
        {
            if (_main is null) return;
            var folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "NonBlockingLife", "Sounds");
            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
            Process.Start(new ProcessStartInfo(folder) { UseShellExecute = true });
        });
    }
    
}
