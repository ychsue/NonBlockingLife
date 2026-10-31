using System.Text.Json.Nodes;

namespace Nbl.Bridge;

public static class SupabaseRpcProxy
{
    private static readonly HttpClient _httpClient = new();

    public static async Task<JsonNode?> CallRpcAsync(string url, string key, string rpcName, JsonNode? payload = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/rpc/{rpcName}");
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", key);

        request.Content = new StringContent(
            payload?.ToJsonString() ?? "{}", System.Text.Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonNode.Parse(responseContent);
    }
}