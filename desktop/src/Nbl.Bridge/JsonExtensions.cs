using System.Text.Json.Nodes;

namespace Nbl.Bridge;
public static class JsonExtensions
{
    public static string? GetStringOrNumber(JsonNode? node)
    {
        if (node is not JsonValue val) return null;

        if (val.TryGetValue<string>(out var s)) return s;
        if (val.TryGetValue<long>(out var l)) return l.ToString();
        if (val.TryGetValue<double>(out var d)) return d.ToString();

        return val.ToString();
    }
}