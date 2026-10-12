namespace Nbl.Bridge;

/// <summary>shell 提供的平台動作；Bridge 只依賴此介面，方便測試。</summary>
public interface IDesktopHost
{
    void ShowNotification(int id, string title, string body, bool isAlarm);

    /// <summary>以系統預設程式開啟（呼叫端已確認為 http/https）。</summary>
    void OpenExternal(Uri url);

    /// <summary>桌面沒有統一的分享面板，目前實作為複製到剪貼簿並通知。</summary>
    void Share(string title, string text);
}
