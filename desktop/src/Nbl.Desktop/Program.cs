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
        using var instance = options.AllowMultiple ? null : SingleInstance.TryAcquire(options.ProtocolUri);
        if (!options.AllowMultiple && instance is null) return;
        Instance = instance;

        // 捕捉 .NET 全域未處理例外
        AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            Console.WriteLine($"[Fatal Unhandled] {e.ExceptionObject}");

        TaskScheduler.UnobservedTaskException += (s, e) =>
            Console.WriteLine($"[Fatal Task] {e.Exception}");


        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);
    }

    public static SingleInstance? Instance { get; private set; }

    // Avalonia configuration, don't remove; also used by visual designer.
    public static AppBuilder BuildAvaloniaApp()
    {
        var builder = AppBuilder.Configure<App>();

        // 偵測平台
        if (OperatingSystem.IsLinux())
        {
            Console.WriteLine("[NBL-DEBUG] Linux, try to use Wayland。");
            builder.UseWayland().UseX11();
            //需要渲染引擎
            builder.UseSkia();
            // Need text shaping engine
            builder.UseHarfBuzz();
        }
        else
        {
            Console.WriteLine("[NBL-DEBUG] others, detected by itself");
            builder.UsePlatformDetect();
        }

        return builder
#if DEBUG
          .WithDeveloperTools()
#endif
          .WithInterFont()
          .With(new X11PlatformOptions
          {
              WmClass = "io.github.ychsue.nonblockinglife"
          })
          .LogToTrace();
    }
}
