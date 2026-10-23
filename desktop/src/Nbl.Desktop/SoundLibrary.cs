using System.Diagnostics;

namespace Nbl.Desktop;

/// <summary>使用者自訂鈴聲目錄。設定只存檔名；播放時才解析，找不到就回傳 null（由播放器退回內建 DEFAULT.mp3）。</summary>
public static class SoundLibrary
{
    private static readonly string[] Extensions = { ".mp3", ".wav", ".ogg", ".flac", ".m4a", ".wma" };

    public static string Dir { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NonBlockingLife", "sounds");

    public static IReadOnlyList<string> List()
    {
        try
        {
            if (!Directory.Exists(Dir)) return Array.Empty<string>();
            return Directory.EnumerateFiles(Dir)
                .Where(f => Extensions.Contains(Path.GetExtension(f), StringComparer.OrdinalIgnoreCase))
                .Select(f => Path.GetFileName(f))
                .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            return Array.Empty<string>();
        }
    }

    /// <summary>檔名 → 完整路徑；只取檔名部分以避免路徑跳脫。</summary>
    public static string? Resolve(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var path = Path.Combine(Dir, Path.GetFileName(name));
        return File.Exists(path) ? path : null;
    }

    public static void OpenFolder()
    {
        Directory.CreateDirectory(Dir);
        Process.Start(new ProcessStartInfo(Dir) { UseShellExecute = true });
    }
}
