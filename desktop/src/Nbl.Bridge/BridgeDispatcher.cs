using System.Text.Json;
using System.Text.Json.Nodes;

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
public sealed class BridgeDispatcher
{
    public const int ProtocolVersion = 1;

    private readonly string _shell;
    private readonly string _shellVersion;
    private readonly IIcsFetcher? _ics;
    private readonly IDesktopHost? _host;
    private readonly AlarmScheduler? _alarms;
    private readonly Func<DateTimeOffset> _now;

    public BridgeDispatcher(
        string shell,
        string shellVersion,
        IIcsFetcher? icsFetcher = null,
        IDesktopHost? host = null,
        AlarmScheduler? alarms = null,
        Func<DateTimeOffset>? now = null)
    {
        _shell = shell;
        _shellVersion = shellVersion;
        _ics = icsFetcher;
        _host = host;
        _alarms = alarms;
        _now = now ?? (() => DateTimeOffset.Now);
    }

    public IReadOnlyList<string> Capabilities
    {
        get
        {
            var caps = new List<string>();
            if (_ics is not null) caps.Add("fetchIcs");
            if (_host is not null) caps.AddRange(new[] { "notify", "openExternal", "share" });
            if (_host is not null && _alarms is not null) caps.Add("alarm");
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
                return Reply("nbl:pong", requestId, _ => { });

            case "nbl:version":
                return Reply("nbl:version-response", requestId,
                    o => o["version"] = _shellVersion);

            case "nbl:hello":
                return Reply("nbl:hello-response", requestId, o =>
                {
                    o["shell"] = _shell;
                    o["shellVersion"] = _shellVersion;
                    o["protocolVersion"] = ProtocolVersion;
                    o["capabilities"] = new JsonArray(
                        Capabilities.Select(c => (JsonNode)JsonValue.Create(c)!).ToArray());
                });

            case "nbl:fetch-ics":
                if (_ics is null) return null;
                var url = req["url"]?.GetValue<string>() ?? "";
                try
                {
                    var ics = await _ics.FetchAsync(url, ct);
                    return Reply("nbl:fetch-ics-response", requestId, o => o["icsContent"] = ics);
                }
                catch (Exception e) when (e is not OperationCanceledException)
                {
                    return Reply("nbl:fetch-ics-response", requestId, o => o["error"] = e.Message);
                }

            case "nbl:notify":
                if (_host is null) return null;
                _host.ShowNotification(
                    req["id"]?.GetValue<int>() ?? 0,
                    req["title"]?.GetValue<string>() ?? "NonBlockingLife",
                    req["body"]?.GetValue<string>() ?? "",
                    isAlarm: false);
                return requestId is null
                    ? null
                    : Reply("nbl:notification-shown", requestId, o => o["notificationId"] = req["id"]?.DeepClone());

            case "nbl:query-notification-permission":
                if (_host is null) return null;
                return Reply("nbl:notification-permission-status", requestId, o => o["granted"] = true);

            case "nbl:query-alarm-setup":
                if (_alarms is null) return null;
                return Reply("nbl:alarm-setup", requestId, o =>
                {
                    o["selectedClockApp"] = ClockApp();
                    o["exactAlarmAllowed"] = true;
                });

            case "nbl:query-clock-apps":
                if (_alarms is null) return null;
                return Reply("nbl:clock-apps", requestId, o =>
                {
                    o["apps"] = new JsonArray(ClockApp());
                    o["selectedPackageName"] = DesktopClockPackage;
                });

            case "nbl:select-clock-app":
                if (_alarms is null) return null;
                return Reply("nbl:select-clock-app-result", requestId, o => o["selectedClockApp"] = ClockApp());

            case "nbl:request-exact-alarm-permission":
                return null;

            case "nbl:set-alarms":
                if (_alarms is null) return null;
                var results = _alarms.Set(req["alarms"] as JsonArray ?? new JsonArray(), _now());
                return Reply("nbl:set-alarms-result", requestId, o =>
                    o["results"] = new JsonArray(results.Select(r =>
                    {
                        var item = new JsonObject { ["id"] = r.Id, ["mode"] = r.Mode, ["ok"] = r.Ok };
                        if (r.Reason is not null) item["reason"] = r.Reason;
                        return (JsonNode)item;
                    }).ToArray()));

            case "nbl:open-external":
                if (_host is null) return null;
                var ok = Uri.TryCreate(req["url"]?.GetValue<string>(), UriKind.Absolute, out var target)
                         && target.Scheme is "http" or "https";
                if (ok) _host.OpenExternal(target!);
                return Reply("nbl:open-external-response", requestId, o => o["ok"] = ok);

            case "nbl:share":
                if (_host is null) return null;
                var title = req["title"]?.GetValue<string>() ?? "";
                var text = string.Join("\n", new[] { req["text"]?.GetValue<string>(), req["url"]?.GetValue<string>() }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));
                _host.Share(title, text);
                return Reply("nbl:share-response", requestId, o => o["ok"] = true);

            default:
                return null;
        }
    }

    private const string DesktopClockPackage = "nbl.desktop";

    private static JsonObject ClockApp() =>
        new() { ["packageName"] = DesktopClockPackage, ["label"] = "NBL Desktop" };

    private static string Reply(string type, string? requestId, Action<JsonObject> fill)
    {
        var o = new JsonObject { ["type"] = type, ["requestId"] = requestId };
        fill(o);
        return o.ToJsonString();
    }
}
