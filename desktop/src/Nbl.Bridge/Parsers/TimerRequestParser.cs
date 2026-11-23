namespace Nbl.Bridge.Parsers;
using System.Text.Json.Nodes;
using Nbl.Bridge.Requests;
public static class TimerRequestParser
{
    public static TimerRequest? FromJson(JsonObject req)
    {
        try
        {
            var timerRequest = new TimerRequest(
                DurationInSeconds: int.TryParse(req["duration"]?.ToString(), out var duration) ? duration : 0,
                SkipUi: bool.TryParse(req["skipUi"]?.ToString(), out var skipUi) && skipUi,
                Title: req["title"]?.ToString() ?? "",
                Url: req["url"]?.ToString()
            );
            return timerRequest;
        }
        catch
        {
            return null;
        }
    }

    public static TimerRequest? FromJsonString(string json)
    {
        try
        {
            var req = JsonNode.Parse(json)?.AsObject();
            if (req == null) return null;
            return FromJson(req);
        }
        catch
        {
            return null;
        }
    }

    public static TimerRequest? FromUri(Uri? uri)
    {
        try
        {
            if (uri is null) return null;
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
            var req = query.ToJsonObject();
            return FromJson(req);
        }
        catch
        {
            return null;
        }
    }
}