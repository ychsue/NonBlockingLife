using Avalonia;
using System;

namespace Nbl.Desktop;

class Program
{
    // Initialization code. Don't use any Avalonia, third-party APIs or any
    // SynchronizationContext-reliant code before AppMain is called: things aren't initialized
    // yet and stuff might break.
    [STAThread]
    public static void Main(string[] args)
    {
        var traceFile = Environment.GetEnvironmentVariable("NBL_TRACE_FILE");
        if (!string.IsNullOrEmpty(traceFile))
        {
            System.Diagnostics.Trace.Listeners.Add(new System.Diagnostics.TextWriterTraceListener(traceFile));
            System.Diagnostics.Trace.AutoFlush = true;
        }
        var options = LaunchOptions.Parse(args);
        using var instance = options.AllowMultiple ? null : SingleInstance.TryAcquire();
        if (!options.AllowMultiple && instance is null) return;
        Instance = instance;
        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);
    }

    public static SingleInstance? Instance { get; private set; }

    // Avalonia configuration, don't remove; also used by visual designer.
    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
#if DEBUG
            .WithDeveloperTools()
#endif
            .WithInterFont()
            .LogToTrace();
}
