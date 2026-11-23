// 目前有四種 Intents (ShowClock, SetTimer, OpenExternal, PWAUrlAction) 四種，要放到 BridgeDispatcher 裡面
// ShowClock: 顯示時鐘
// SetTimer: 設定計時器
// OpenExternal: 開啟外部連結
// PWAUrlAction: 透過 nbl:url-action 執行 PWA 相關操作
using System.Text.Json.Nodes;
using Nbl.Bridge.Requests;
using Nbl.Bridge.Parsers;
using System.Text.Json;

namespace Nbl.Bridge.Actions;

public class NblActionExecutor(
    IDesktopHost? host = null,
    TimerService? timers = null
    )
{
    private readonly IDesktopHost? _host = host;
    private readonly TimerService? _timers = timers;

    public async Task<bool> SetTimerAsync(TimerRequest? request, Func<string, Task<bool>> openUrlTask)
    {
        if (_host is null || request is null) return false;
        try
        {
            // 1. 嘗試新增計時器
            _timers?.Add(
                request.DurationInSeconds,
                request.SkipUi,
                request.Title,
                DateTimeOffset.Now,
                _host
            );
            // 2. 嘗試開啟 URL
            if (!string.IsNullOrEmpty(request.Url))
            {
                return await openUrlTask(request.Url);
            }
        }
        catch
        {
            return false;
        }
        return true;
    }

    public async Task<bool> ShowClockAsync(ShowClockRequest? request,  Func<string, Task<bool>> openUrlTask)
    {
        if (request is null) return false;
        try
        {
            _host?.ShowClockWindow(1);
            if (!string.IsNullOrEmpty(request.Url))
            {
                return await openUrlTask(request.Url);
            }
        }
        catch
        {
            return false;
        }
        return true;
    }

    public bool OpenExternal(string? url)
    {
        if (_host is null || string.IsNullOrEmpty(url)) return false;
        try
        {
            _host.OpenExternal(new Uri(url));
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<string?> PWAUrlAction(string? url)
    {
        if (_host is null || string.IsNullOrEmpty(url)) return null;
        var reply = MsgReplyToPWA("nbl:url-action", "host_", o => o["url"] = url);
        var js = $"window.__nblDesktopReceive && window.__nblDesktopReceive({JsonSerializer.Serialize(reply)});";
        return await _host.ExecuteJS(js);

    }

    public static string MsgReplyToPWA(string type, string? requestId, Action<JsonObject> fill)
    {
        var o = new JsonObject { ["type"] = type, ["requestId"] = requestId };
        fill(o);
        return o.ToJsonString();
    }

}