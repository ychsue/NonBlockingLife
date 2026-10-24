using Nbl.Bridge;

namespace Nbl.Desktop;

/// <summary>Store（MSIX）版的開機啟動：使用 manifest 宣告的 StartupTask，不寫 Registry。</summary>
internal static class StoreStartup
{
    public const string TaskId = "NblStartup";

    /// <summary>是否由開機 StartupTask 啟動（此時不會有 --background 參數）。</summary>
    public static bool LaunchedByStartupTask()
    {
#if WINDOWS
        try
        {
            return PackageIdentity.IsPackaged &&
                Windows.ApplicationModel.AppInstance.GetActivatedEventArgs()?.Kind
                    == Windows.ApplicationModel.Activation.ActivationKind.StartupTask;
        }
        catch (Exception e)
        {
            System.Diagnostics.Trace.WriteLine($"[nbl] activation kind query failed: {e.Message}");
            return false;
        }
#else
        return false;
#endif
    }

    public static bool IsAvailable =>
#if WINDOWS
        PackageIdentity.IsPackaged;
#else
        false;
#endif

    public static async Task<bool> IsEnabledAsync()
    {
#if WINDOWS
        var task = await Windows.ApplicationModel.StartupTask.GetAsync(TaskId);
        return task.State is Windows.ApplicationModel.StartupTaskState.Enabled
            or Windows.ApplicationModel.StartupTaskState.EnabledByPolicy;
#else
        await Task.CompletedTask;
        return false;
#endif
    }

    /// <summary>回傳最終是否為啟用；使用者在系統設定停用或被原則禁止時無法由程式啟用。</summary>
    public static async Task<bool> SetEnabledAsync(bool enabled)
    {
#if WINDOWS
        var task = await Windows.ApplicationModel.StartupTask.GetAsync(TaskId);
        if (enabled) await task.RequestEnableAsync();
        else task.Disable();
        return await IsEnabledAsync();
#else
        await Task.CompletedTask;
        return false;
#endif
    }
}
