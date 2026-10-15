using System.Diagnostics;

namespace Nbl.Bridge;

/// <summary>在作業系統註冊 nonblockinglife:// 連結。Windows：HKCU\Software\Classes；Linux：.desktop + xdg-mime；macOS 尚未支援。</summary>
public static class ProtocolRegistration
{
    private const string WinKey = @"Software\Classes\" + ProtocolUri.Scheme;

    public static bool IsSupported => OperatingSystem.IsWindows() || OperatingSystem.IsLinux();

    /// <summary>以 `dotnet app.dll` 執行時，命令必須帶上 dll 路徑；不含 URI 參數。</summary>
    public static IReadOnlyList<string> ResolveCommand(string? processPath, string? entryAssemblyPath)
    {
        if (string.IsNullOrEmpty(processPath)) return Array.Empty<string>();
        var isDotnetHost = string.Equals(
            Path.GetFileNameWithoutExtension(processPath), "dotnet", StringComparison.OrdinalIgnoreCase);
        if (!isDotnetHost) return new[] { processPath };
        return string.IsNullOrEmpty(entryAssemblyPath) ? Array.Empty<string>() : new[] { processPath, entryAssemblyPath };
    }

    public static string BuildWindowsCommand(IEnumerable<string> parts) =>
        string.Join(" ", parts.Select(p => $"\"{p}\"")) + " \"%1\"";

    public static string BuildDesktopEntry(IEnumerable<string> parts) =>
        "[Desktop Entry]\nType=Application\nName=NonBlockingLife\nNoDisplay=true\nExec=" +
        string.Join(" ", parts.Select(p => p.Contains(' ') ? $"\"{p}\"" : p)) +
        " %u\nMimeType=x-scheme-handler/" + ProtocolUri.Scheme + ";\n";

    private static string LinuxEntryPath() =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".local", "share", "applications", "nonblockinglife-url.desktop");

    private static IReadOnlyList<string> CurrentCommand() =>
        ResolveCommand(Environment.ProcessPath, System.Reflection.Assembly.GetEntryAssembly()?.Location);

    public static bool IsRegistered()
    {
        var cmd = CurrentCommand();
        if (cmd.Count == 0) return false;
        if (OperatingSystem.IsWindows())
        {
            using var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(WinKey + @"\shell\open\command");
            return key?.GetValue(null) as string == BuildWindowsCommand(cmd);
        }
        if (OperatingSystem.IsLinux())
        {
            var path = LinuxEntryPath();
            return File.Exists(path) && File.ReadAllText(path) == BuildDesktopEntry(cmd);
        }
        return false;
    }

    public static void SetRegistered(bool registered)
    {
        var cmd = CurrentCommand();
        if (registered && cmd.Count == 0) return;

        if (OperatingSystem.IsWindows())
        {
            if (registered)
            {
                using var root = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(WinKey);
                root.SetValue(null, "URL:NonBlockingLife");
                root.SetValue("URL Protocol", "");
                using var command = root.CreateSubKey(@"shell\open\command");
                command.SetValue(null, BuildWindowsCommand(cmd));
            }
            else
            {
                Microsoft.Win32.Registry.CurrentUser.DeleteSubKeyTree(WinKey, throwOnMissingSubKey: false);
            }
        }
        else if (OperatingSystem.IsLinux())
        {
            var path = LinuxEntryPath();
            if (registered)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                File.WriteAllText(path, BuildDesktopEntry(cmd));
                RunQuietly("xdg-mime", "default", Path.GetFileName(path), "x-scheme-handler/" + ProtocolUri.Scheme);
            }
            else if (File.Exists(path)) File.Delete(path);
        }
        else
        {
            Trace.WriteLine("[nbl] protocol registration is not supported on this OS");
        }
    }

    private static void RunQuietly(string file, params string[] args)
    {
        try
        {
            var psi = new ProcessStartInfo(file) { UseShellExecute = false, CreateNoWindow = true };
            foreach (var a in args) psi.ArgumentList.Add(a);
            Process.Start(psi)?.WaitForExit(3000);
        }
        catch (System.ComponentModel.Win32Exception)
        {
            // 沒有 xdg-mime 時略過，.desktop 檔仍已寫入
        }
    }
}
