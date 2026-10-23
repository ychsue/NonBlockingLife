using System.Text.Json.Nodes;
using Nbl.Bridge;
using Xunit;

namespace Nbl.Bridge.Tests;

public class BridgeDispatcherTests
{
    private sealed class FakeFetcher(Func<string, string> f) : IIcsFetcher
    {
        public Task<string> FetchAsync(string url, CancellationToken ct) => Task.FromResult(f(url));
    }

    private static JsonObject Parse(string? s) => (JsonObject)JsonNode.Parse(s!)!;

    [Fact]
    public async Task Hello_ReportsShellAndCapabilities()
    {
        var d = new BridgeDispatcher("windows", "1.2.3", new FakeFetcher(_ => ""));
        var r = Parse(await d.HandleAsync("""{"type":"nbl:hello","requestId":"r1"}"""));
        Assert.Equal("nbl:hello-response", (string?)r["type"]);
        Assert.Equal("r1", (string?)r["requestId"]);
        Assert.Equal("windows", (string?)r["shell"]);
        Assert.Equal(1, (int?)r["protocolVersion"]);
        Assert.Equal("fetchIcs", (string?)r["capabilities"]![0]);
    }

    [Fact]
    public async Task Ping_And_Version_Reply_With_RequestId()
    {
        var d = new BridgeDispatcher("windows", "9.9");
        Assert.Equal("r2", (string?)Parse(await d.HandleAsync("""{"type":"nbl:ping","requestId":"r2"}"""))["requestId"]);
        Assert.Equal("9.9", (string?)Parse(await d.HandleAsync("""{"type":"nbl:version","requestId":"r3"}"""))["version"]);
    }

    [Fact]
    public async Task FetchIcs_ReturnsContent_Or_Error()
    {
        var ok = new BridgeDispatcher("windows", "1", new FakeFetcher(_ => "BEGIN:VCALENDAR"));
        var r = Parse(await ok.HandleAsync("""{"type":"nbl:fetch-ics","requestId":"a","url":"https://x/y.ics"}"""));
        Assert.Equal("BEGIN:VCALENDAR", (string?)r["icsContent"]);

        var bad = new BridgeDispatcher("windows", "1", new FakeFetcher(_ => throw new InvalidOperationException("boom")));
        var e = Parse(await bad.HandleAsync("""{"type":"nbl:fetch-ics","requestId":"b","url":"u"}"""));
        Assert.Equal("boom", (string?)e["error"]);
        Assert.Null(e["icsContent"]);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("""{"type":"nbl:unknown"}""")]
    [InlineData("""{"foo":1}""")]
    public async Task UnknownOrInvalid_ReturnsNull(string msg)
    {
        var d = new BridgeDispatcher("windows", "1");
        Assert.Null(await d.HandleAsync(msg));
    }
}

public class OriginPolicyTests
{
    [Theory]
    [InlineData("https://ychsue.github.io/NonBlockingLife/", true)]
    [InlineData("http://127.0.0.1:5000/NonBlockingLife/", true)]
    [InlineData("https://evil.example.com/", false)]
    [InlineData("https://ychsue.github.io.evil.com/", false)]
    [InlineData("about:blank", true)]
    public void IsAllowed(string url, bool expected)
    {
        var p = new OriginPolicy(new[] { "https://ychsue.github.io", "http://127.0.0.1:5000" });
        Assert.Equal(expected, p.IsAllowed(new Uri(url)));
    }
}

public class HttpIcsFetcherTests
{
    [Theory]
    [InlineData("file:///c:/x.ics")]
    [InlineData("ftp://x/y.ics")]
    [InlineData("nonsense")]
    public async Task RejectsNonHttp(string url)
    {
        await Assert.ThrowsAsync<ArgumentException>(
            () => new HttpIcsFetcher().FetchAsync(url, default));
    }
}
