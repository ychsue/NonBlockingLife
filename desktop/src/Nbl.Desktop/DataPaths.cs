using Nbl.Bridge;

namespace Nbl.Desktop;

public static class DataPaths
{
    /// <summary>
    /// 套件（MSIX）模式下 %LOCALAPPDATA% 會被虛擬化，檔案總管看不到程式寫入的內容；
    /// 改用套件的 LocalState，真實路徑可開啟，且解除安裝時一併刪除。
    /// </summary>
    public static string Root { get; } = Resolve();

    private static string Resolve()
    {
#if WINDOWS
        if (PackageIdentity.IsPackaged)
        {
            try { return Windows.Storage.ApplicationData.Current.LocalFolder.Path; }
            catch (Exception e) { System.Diagnostics.Trace.WriteLine($"[nbl] LocalFolder failed: {e.Message}"); }
        }
#endif
        return Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NonBlockingLife");
    }
}
