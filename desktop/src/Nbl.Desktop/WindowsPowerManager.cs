using System.Runtime.InteropServices;
using Avalonia.Threading;
using Microsoft.Win32;

namespace Nbl.Desktop;

internal sealed class WindowsPowerManager : IDisposable
{
    private const uint EsSystemRequired = 0x00000001;
    private const uint EsContinuous = 0x80000000;

    private readonly bool _isWindows = OperatingSystem.IsWindows();
    private readonly Action _onResume;
    private bool _systemRequired;
    private bool _failureReported;
    private bool _disposed;

    public WindowsPowerManager(Action onResume)
    {
        _onResume = onResume;
        if (_isWindows)
            SystemEvents.PowerModeChanged += OnPowerModeChanged;
    }

    public void SetSystemRequired(bool required, bool force = false)
    {
        if (!_isWindows || _disposed || (!force && required == _systemRequired)) return;

        var flags = EsContinuous | (required ? EsSystemRequired : 0);
        if (SetThreadExecutionState(flags) == 0)
        {
            if (!_failureReported)
            {
                System.Diagnostics.Trace.WriteLine(
                    $"[nbl] SetThreadExecutionState failed: {Marshal.GetLastWin32Error()}");
                _failureReported = true;
            }
            return;
        }

        _systemRequired = required;
        _failureReported = false;
    }

    public void Dispose()
    {
        if (_disposed) return;
        if (_isWindows)
            SystemEvents.PowerModeChanged -= OnPowerModeChanged;
        SetSystemRequired(false, force: true);
        _disposed = true;
    }

    private void OnPowerModeChanged(object? sender, PowerModeChangedEventArgs e)
    {
        if (e.Mode == PowerModes.Resume)
            Dispatcher.UIThread.Post(_onResume);
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint SetThreadExecutionState(uint esFlags);
}
