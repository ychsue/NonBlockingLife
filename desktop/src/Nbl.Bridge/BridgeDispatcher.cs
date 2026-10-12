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

    public BridgeDispatcher(string shell, string shellVersion, IIcsFetcher? icsFetcher = null)
    {
        _shell = shell;
        _shellVersion = shellVersion;
        _ics = icsFetcher;
    }

    public IReadOnlyList<string> Capabilities =>
        _ics is null ? Array.Empty<string>() : new[] { "fetchIcs" };

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

            default:
                return null;
        }
    }

    private static string Reply(string type, string? requestId, Action<JsonObject> fill)
    {
        var o = new JsonObject { ["type"] = type, ["requestId"] = requestId };
        fill(o);
        return o.ToJsonString();
    }
}
