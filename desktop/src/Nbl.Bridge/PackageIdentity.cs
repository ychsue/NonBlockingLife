using System.Runtime.InteropServices;

namespace Nbl.Bridge;

/// <summary>偵測是否以 MSIX 套件身分執行（Microsoft Store 版）。套件內不可寫 Registry，改由 manifest 宣告。</summary>
public static class PackageIdentity
{
    private const int AppModelErrorNoPackage = 15700;
    private static readonly Lazy<bool> _isPackaged = new(Detect);

    public static bool IsPackaged => _isPackaged.Value;

    private static bool Detect()
    {
        if (!OperatingSystem.IsWindows()) return false;
        try
        {
            uint length = 0;
            return GetCurrentPackageFullName(ref length, null) != AppModelErrorNoPackage;
        }
        catch (EntryPointNotFoundException)
        {
            return false;
        }
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetCurrentPackageFullName(ref uint packageFullNameLength, char[]? packageFullName);
}
