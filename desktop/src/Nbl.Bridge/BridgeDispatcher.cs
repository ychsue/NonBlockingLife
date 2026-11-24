using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Nbl.Bridge.Actions;
using Nbl.Bridge.Parsers;

namespace Nbl.Bridge;

public interface IIcsFetcher
{
    /// <summary>抓取 ICS 文字；失敗時丟出例外。</summary>
    Task<string> FetchAsync(string url, CancellationToken ct);
}

/// <summary>
/// 處理來自 PWA 的 nbl:* 訊息（協定見 protocol/messages.md）。
/// 輸入/輸出皆為 JSON 字串；回傳 null 表示不需回應。
/// </summary>
public sealed class BridgeDispatcher(
    string shell,
    string shellVersion,
    IIcsFetcher? icsFetcher = null,
    IDesktopHost? host = null,
    AlarmScheduler? alarms = null,
    TimerService? timers = null,
    Func<DateTimeOffset>? now = null)
{
    public static bool IsFlatpak => !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("FLATPAK_ID"));

    public const int ProtocolVersion = 1;

    private readonly string _shell = shell;
    private readonly string _shellVersion = shellVersion;
    private readonly IIcsFetcher? _ics = icsFetcher;
    private readonly IDesktopHost? _host = host;
    private readonly AlarmScheduler? _alarms = alarms;
    private readonly TimerService? _timers = timers;
    private readonly Func<DateTimeOffset> _now = now ?? (() => DateTimeOffset.Now);

    private readonly NblActionExecutor _executor = new(host, timers);

    public IReadOnlyList<string> Capabilities
    {
        get
        {
            var caps = new List<string>();
            if (_ics is not null) caps.Add("fetchIcs");
            if (_host is not null) caps.AddRange(new[] { "notify", "openUrlByHost", "openExternal", "share" }); // openExternal 未來要拿掉
            if (_host is not null && _alarms is not null) caps.Add("alarm");
            if (_host is not null && _timers is not null) caps.Add("timer");
            if (_host is not null && _timers is not null) caps.Add("clockThroughPM");
            if (IsFlatpak) caps.Add("supabaseRpc");
            return caps;
        }
    }

    public async Task<string?> HandleAsync(string message, CancellationToken ct = default)
    {
        JsonObject? req;
        try { req = JsonNode.Parse(message) as JsonObject; }
        catch (JsonException) { return null; }

        var type = req?["type"]?.GetValue<string>();
        var requestId = req?["requestId"]?.GetValue<string>();
        if (req is null || type is null) return null;

        switch (type)
        {
            case "nbl:ping":
                return NblActionExecutor.MsgReplyToPWA("nbl:pong", requestId, _ => { });

            case "nbl:version":
                return NblActionExecutor.MsgReplyToPWA("nbl:version-response", requestId,
                    o => o["version"] = _shellVersion);

            case "nbl:hello":
                return NblActionExecutor.MsgReplyToPWA("nbl:hello-response", requestId, o =>
                {
                    o["shell"] = _shell;
                    o["shellVersion"] = _shellVersion;
                    o["protocolVersion"] = ProtocolVersion;
                    o["capabilities"] = new JsonArray(
                        Capabilities.Select(c => (JsonNode)JsonValue.Create(c)!).ToArray());
                });

            case "nbl:fetch-ics":
                {
                    if (_ics is null) return null;
                    var url = req["url"]?.GetValue<string>() ?? "";
                    try
                    {
                        var ics = await _ics.FetchAsync(url, ct);
                        return NblActionExecutor.MsgReplyToPWA("nbl:fetch-ics-response", requestId, o => o["icsContent"] = ics);
                    }
                    catch (Exception e) when (e is not OperationCanceledException)
                    {
                        return NblActionExecutor.MsgReplyToPWA("nbl:fetch-ics-response", requestId, o => o["error"] = e.Message);
                    }
                }
            case "nbl:notify":
                if (_host is null) return null;
                _host.ShowNotification(new ToastOptions
                {
                    Id = JsonExtensions.GetStringOrNumber(req["id"]) ?? Guid.NewGuid().ToString(),
                    Title = req["title"]?.GetValue<string>() ?? "NonBlockingLife",
                    Body = req["body"]?.GetValue<string>() ?? "",
                    IsAlarm = false,
                    ClickToClose = req["dismissOnClick"]?.GetValue<bool>() ?? false,
                    Duration = TimeSpan.FromSeconds(req["duration"]?.GetValue<int?>() ?? 0)
                });
                return requestId is null
                    ? null
                    : NblActionExecutor.MsgReplyToPWA("nbl:notification-shown", requestId, o => o["notificationId"] = req["id"]?.DeepClone());

            case "nbl:query-notification-permission":
                if (_host is null) return null;
                return NblActionExecutor.MsgReplyToPWA("nbl:notification-permission-status", requestId, o => o["granted"] = true);

            case "nbl:query-alarm-setup":
                if (_alarms is null) return null;
                return NblActionExecutor.MsgReplyToPWA("nbl:alarm-setup", requestId, o =>
                {
                    o["selectedClockApp"] = ClockApp();
                    o["exactAlarmAllowed"] = true;
                });

            case "nbl:query-clock-apps":
                if (_alarms is null) return null;
                return NblActionExecutor.MsgReplyToPWA("nbl:clock-apps", requestId, o =>
                {
                    o["apps"] = new JsonArray(ClockApp());
                    o["selectedPackageName"] = DesktopClockPackage;
                });

            case "nbl:select-clock-app":
                if (_alarms is null) return null;
                return NblActionExecutor.MsgReplyToPWA("nbl:select-clock-app-result", requestId, o => o["selectedClockApp"] = ClockApp());

            case "nbl:request-exact-alarm-permission":
                return null;

            case "nbl:set-alarms":
                if (_alarms is null) return null;
                var results = _alarms.Set(req["alarms"] as JsonArray ?? new JsonArray(), _now());
                return NblActionExecutor.MsgReplyToPWA("nbl:set-alarms-result", requestId, o =>
                    o["results"] = new JsonArray(results.Select(r =>
                    {
                        var item = new JsonObject { ["id"] = r.Id, ["mode"] = r.Mode, ["ok"] = r.Ok };
                        if (r.Reason is not null) item["reason"] = r.Reason;
                        return (JsonNode)item;
                    }).ToArray()));

            case "nbl:get-alarms":
                if (_alarms is null) return null;
                return NblActionExecutor.MsgReplyToPWA("nbl:alarms", requestId, o =>
                    o["alarms"] = new JsonArray(_alarms.Snapshot().Select(a => (JsonNode)new JsonObject
                    {
                        ["id"] = a.Id,
                        ["mode"] = a.Mode,
                        ["label"] = a.Label,
                        ["fireAt"] = a.FireAt.ToUnixTimeMilliseconds(),
                    }).ToArray()));

            case "nbl:cancel-alarms":
                if (_alarms is null) return null;
                var cancelIds = (req["ids"] as JsonArray ?? new JsonArray())
                    .Select(n => n is JsonValue v && v.TryGetValue<int>(out var i) ? (int?)i : null)
                    .OfType<int>().ToList();
                var removed = _alarms.RemoveByIds(cancelIds);
                return NblActionExecutor.MsgReplyToPWA("nbl:cancel-alarms-result", requestId, o => o["removed"] = removed);

            case "nbl:open-url":
            case "nbl:open-external": // TODO 未來要拿掉
                if (_host is null) return null;
                var ok = false;
                var oeUrl = req["url"]?.GetValue<string>();
                // 1. 先確定是否是 nonblockinglife:// 連結
                ok = await OpenExternalOrNavigate(oeUrl);
                return NblActionExecutor.MsgReplyToPWA("nbl:open-url-response", requestId, o => o["ok"] = ok);

            case "nbl:share":
                {
                    if (_host is null) return null;
                    var title = req["title"]?.GetValue<string>() ?? "";
                    var text = string.Join("\n", new[] { req["text"]?.GetValue<string>(), req["url"]?.GetValue<string>() }
                        .Where(s => !string.IsNullOrWhiteSpace(s)));
                    _host.Share(title, text);
                    return NblActionExecutor.MsgReplyToPWA("nbl:share-response", requestId, o => o["ok"] = true);
                }
            case "nbl:supabase-rpc":
                {
                    var url = req["url"]?.GetValue<string>() ?? "";
                    var key = req["key"]?.GetValue<string>() ?? "";
                    var rpcName = req["rpcName"]?.GetValue<string>() ?? "";
                    var payload = req["payload"]?.AsObject();
                    var result = await SupabaseRpcProxy.CallRpcAsync(url, key, rpcName, payload);
                    return NblActionExecutor.MsgReplyToPWA("nbl:supabase-rpc-response", requestId, o => o["data"] = result);
                }
            case "nbl:show-clock":
                {
                    var showClockRequest = ShowClockRequestParser.FromJson(req);
                    if (showClockRequest is null)
                        return NblActionExecutor.MsgReplyToPWA("nbl:show-clock-response", requestId, o => o["ok"] = false);
                    ok = await _executor.ShowClockAsync(showClockRequest, OpenExternalOrNavigate);
                    return NblActionExecutor.MsgReplyToPWA("nbl:show-clock-response", requestId, o => o["ok"] = ok);
                }
            case "nbl:set-timer":
                {
                    var timerRequest = TimerRequestParser.FromJson(req);
                    if (timerRequest is not null)
                    {
                        ok = await _executor.SetTimerAsync(timerRequest, OpenExternalOrNavigate);
                        return NblActionExecutor.MsgReplyToPWA("nbl:set-timer-response", requestId, o => o["ok"] = ok);
                    }
                    return NblActionExecutor.MsgReplyToPWA("nbl:set-timer-response", requestId, o => o["ok"] = false);
                }
            default:
                return null;
        }
    }

    private Uri? GetAbsoluteUri(string oeUrl)
    {
        // 如果 BaseUri 的 path 與 oeUrl 的最前面重疊，只要一個 path 即可，
        // 如果 oeUrl 是以英文字母，數字，- 與 _ 開頭，然後接 ://，則視為絕對網址，不加上 BaseUri 的 path
        // 去掉 oeUrl 前面與 BaseUri 重疊的部分，順便去掉oeUrl 前面 /NonBlockingLife/ (如果有的話)
        if (_host?.BaseUri is not null && !Validators.IsAbsoluteUrl(oeUrl))
        {
            var basePath = _host.BaseUri.AbsolutePath.TrimEnd('/');
            // 因為 new Uri(_host.BaseUri, oeUrl) 會將 BaseUri 的 path 丟掉後再組合 oeUrl，所以，必須取下他的 basePath，視情況組合回 oeUrl
            if (!oeUrl.StartsWith(basePath))
            {
                oeUrl = basePath + (oeUrl[0] == '/' ? oeUrl : ("/" + oeUrl));
            }
        }
        var absoluteUri = _host?.BaseUri is not null ? new Uri(_host.BaseUri, oeUrl) : null;
        // 測試這個 absoluteUri 是否正確
        Uri.TryCreate(absoluteUri?.ToString(), UriKind.Absolute, out var testUri);
        return testUri;
    }

    private async Task<bool> OpenExternalOrNavigate(String? oeUrl)
    {
        if (_host is null) return false;
        if (oeUrl is null) return false;
        // 如果 oeUrl 含有 ?open_external=true 或者 &open_external=true，則應該使用 OpenExternal，而不是 PWAUrlAction
        var isOpenExternal = oeUrl.Contains("?open_external=true") || oeUrl.Contains("&open_external=true");
        oeUrl = oeUrl.Replace("?open_external=true", "").Replace("&open_external=true", "");
        // 取得 oeUrl 的絕對uri ，根據 _host.BaseUri 來處理
        var absoluteUri = GetAbsoluteUri(oeUrl);
        if (absoluteUri is null) return false;
        if (isOpenExternal)
        {
            return _executor.OpenExternal(absoluteUri.ToString());
        }
        // 1. 如果 Host 是 show-clock 或 set-timer，使用內建
        if (absoluteUri.Host == "show-clock")
        {
            var showClockRequest = ShowClockRequestParser.FromUri(absoluteUri);
            if (showClockRequest is null) return false;
            return await _executor.ShowClockAsync(showClockRequest, OpenExternalOrNavigate);
        }
        else if (absoluteUri.Host == "set-timer")
        {
            var timerRequest = TimerRequestParser.FromUri(absoluteUri);
            if (timerRequest is null) return false;
            return await _executor.SetTimerAsync(timerRequest, OpenExternalOrNavigate);
        }
        // 以下情形要使用 PWAUrlAction (就是開頭為 BaseUrl， 的)，其餘使用 OpenExternal，
        if (absoluteUri.Host == _host.BaseUri?.Host || absoluteUri.Scheme == "nonblockinglife")
        {
            await _executor.PWAUrlAction(absoluteUri.ToString());
            return true;
        }
        else
        {
            return _executor.OpenExternal(absoluteUri.ToString());
        }
    }

    private const string DesktopClockPackage = "nbl.desktop";

    private static JsonObject ClockApp() =>
        new() { ["packageName"] = DesktopClockPackage, ["label"] = "NBL Desktop" };

}

public static partial class Validators
{
        [GeneratedRegex(@"^[A-Za-z0-9\-_]+://")]
        public static partial Regex AbsoluteUrlPrefix();

        public static bool IsAbsoluteUrl(string url) => AbsoluteUrlPrefix().IsMatch(url);
}