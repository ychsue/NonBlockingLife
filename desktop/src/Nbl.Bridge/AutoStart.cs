using System.Diagnostics;

namespace Nbl.Bridge;

/// <summary>開機自動啟動。Windows：HKCU Run；Linux：~/.config/autostart；macOS 尚未支援。</summary>
public static class AutoStart
{
    public const string AppName = "NonBlockingLife";
    public const string BackgroundArg = "--background";
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

    public static bool IsSupported => OperatingSystem.IsWindows() || OperatingSystem.IsLinux();

    /// <summary>以 `dotnet app.dll` 執行時，啟動命令必須帶上 dll 路徑。</summary>
    public static IReadOnlyList<string> ResolveCommand(string? processPath, string? entryAssemblyPath)
    {
        if (string.IsNullOrEmpty(processPath)) return Array.Empty<string>();
        var isDotnetHost = string.Equals(
            Path.GetFileNameWithoutExtension(processPath), "dotnet", StringComparison.OrdinalIgnoreCase);
        if (isDotnetHost)
            return string.IsNullOrEmpty(entryAssemblyPath)
                ? Array.Empty<string>()
                : new[] { processPath, entryAssemblyPath, BackgroundArg };
        return new[] { processPath, BackgroundArg };
    }

    public static string ToCommandLine(IEnumerable<string> parts) =>
        string.Join(" ", parts.Select(p => p.Contains(' ') ? $"\"{p}\"" : p));

    public static string BuildDesktopEntry(IEnumerable<string> parts) =>
        "[Desktop Entry]\nType=Application\nName=" + AppName +
        "\nExec=" + string.Join(" ", parts.Select(p => p.Contains(' ') ? $"\"{p}\"" : p)) +
        "\nX-GNOME-Autostart-enabled=true\n";

    private static string LinuxEntryPath()
    {
        var cfg = Environment.GetEnvironmentVariable("XDG_CONFIG_HOME");
        if (string.IsNullOrEmpty(cfg))
            cfg = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".config");
        return Path.Combine(cfg, "autostart", "nonblockinglife.desktop");
    }

    private static IReadOnlyList<string> CurrentCommand() =>
        ResolveCommand(Environment.ProcessPath, Assembly_EntryPath());

    private static string? Assembly_EntryPath() =>
        System.Reflection.Assembly.GetEntryAssembly()?.Location;

    public static bool IsEnabled()
    {
        if (PackageIdentity.IsPackaged) return false;
        if (OperatingSystem.IsWindows())
        {
            using var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(RunKey);
            return key?.GetValue(AppName) is string;
        }
        if (OperatingSystem.IsLinux()) return File.Exists(LinuxEntryPath());
        return false;
    }

    public static void SetEnabled(bool enabled)
    {
        if (PackageIdentity.IsPackaged) return;
        var cmd = CurrentCommand();
        if (enabled && cmd.Count == 0) return;

        if (OperatingSystem.IsWindows())
        {
            using var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(RunKey);
            if (enabled) key.SetValue(AppName, ToCommandLine(cmd));
            else key.DeleteValue(AppName, throwOnMissingValue: false);
        }
        else if (OperatingSystem.IsLinux())
        {
            var path = LinuxEntryPath();
            if (enabled)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                File.WriteAllText(path, BuildDesktopEntry(cmd));
            }
            else if (File.Exists(path)) File.Delete(path);
        }
        else
        {
            Trace.WriteLine("[nbl] autostart is not supported on this OS");
        }
    }
}
