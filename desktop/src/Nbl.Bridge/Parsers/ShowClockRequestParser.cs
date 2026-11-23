namespace Nbl.Bridge.Parsers;
using System.Text.Json.Nodes;
using Nbl.Bridge.Requests;
public static class ShowClockRequestParser
{
    public static ShowClockRequest? FromJson(JsonObject req)
    {
        try
        {
            var showClockRequest = new ShowClockRequest(
                Url: req["url"]?.ToString() ?? ""
            );
            return showClockRequest;
        }
        catch
        {
            return null;
        }
    }

    public static ShowClockRequest? FromJsonString(string json)
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

    public static ShowClockRequest? FromUri(Uri? uri)
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