using System.Collections.Specialized;
using System.Text.Json.Nodes;

namespace Nbl.Bridge.Parsers;

public static class NameValueCollectionExtensions
{
    public static JsonObject ToJsonObject(this NameValueCollection? collection)
    {
        var obj = new JsonObject();
        if (collection != null)
        {
            foreach (string key in collection)
            {
                obj[key] = collection[key];
            }
        }
        return obj;
    }
}