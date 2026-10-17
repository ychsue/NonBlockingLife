namespace Nbl.Bridge;

public class ToastOptions
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsAlarm { get; set; } = false;

    public bool ClickToClose { get; set; } = true;

    /// <summary>預計花多少時間（例如用於專案計時）。若為 null 則使用預設行為。</summary>
    public TimeSpan? Duration { get; set; }

    /// <summary>點擊 Toast 時觸發的行為（不會自動關閉視窗）</summary>
    public Action? OnClick { get; set; }
}
