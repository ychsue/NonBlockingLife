using System.Text.Json.Nodes;
using Nbl.Bridge;
using Xunit;

namespace Nbl.Bridge.Tests;

public class DesktopFeatureTests
{
    private sealed class FakeHost : IDesktopHost
    {
        public List<(string Id, string Title, string Body, bool Alarm)> Notes = new();
        public List<Uri> Opened = new();
        public List<(string Title, string Text)> Shared = new();
        public void ShowNotification(ToastOptions options) => Notes.Add((options.Id, options.Title, options.Body, options.IsAlarm));
        public void OpenExternal(Uri url) => Opened.Add(url);
        public void Share(string title, string text) => Shared.Add((title, text));
        public void ShowMainWindow() { }
        public void ShowClockWindow(int tabIndex = 0) { }
    }

    private static readonly DateTimeOffset Now = new(2026, 10, 12, 9, 0, 0, TimeZoneInfo.Local.GetUtcOffset(new DateTime(2026, 10, 12)));

    private static JsonObject Parse(string? s) => (JsonObject)JsonNode.Parse(s!)!;

    [Fact]
    public async Task Hello_ListsCapabilities_WhenHostAndAlarmsPresent()
    {
        var d = new BridgeDispatcher("windows", "1", null, new FakeHost(), new AlarmScheduler());
        var caps = Parse(await d.HandleAsync("""{"type":"nbl:hello","requestId":"1"}"""))["capabilities"]!
            .AsArray().Select(n => (string)n!).ToArray();
        Assert.Equal(new[] { "notify", "openExternal", "share", "alarm" }, caps);
    }

    [Fact]
    public async Task Notify_ShowsAndOnlyRepliesWithRequestId()
    {
        var host = new FakeHost();
        var d = new BridgeDispatcher("windows", "1", null, host);
        Assert.Null(await d.HandleAsync("""{"type":"nbl:notify","title":"t","body":"b","id":1}"""));
        var r = Parse(await d.HandleAsync("""{"type":"nbl:notify","title":"t2","body":"b2","id":5,"requestId":"q"}"""));
        Assert.Equal("nbl:notification-shown", (string?)r["type"]);
        Assert.Equal(5, (int?)r["notificationId"]);
        Assert.Equal(2, host.Notes.Count);
        Assert.False(host.Notes[0].Alarm);
    }

    [Fact]
    public async Task AlarmSetup_NeedsNoUserDialogs()
    {
        var d = new BridgeDispatcher("windows", "1", null, new FakeHost(), new AlarmScheduler());
        var r = Parse(await d.HandleAsync("""{"type":"nbl:query-alarm-setup","requestId":"1"}"""));
        Assert.Equal("nbl:alarm-setup", (string?)r["type"]);
        Assert.True((bool)r["exactAlarmAllowed"]!);
        Assert.NotNull(r["selectedClockApp"]?["packageName"]);
    }

    [Fact]
    public async Task SetAlarms_ReturnsPerItemResults()
    {
        var d = new BridgeDispatcher("windows", "1", null, new FakeHost(), new AlarmScheduler(), now: () => Now);
        var msg = """
            {"type":"nbl:set-alarms","requestId":"s","alarms":[
              {"id":1,"mode":"clock","time":[10,30],"label":"a"},
              {"id":2,"mode":"exact","time":[2026,10,12,8,0],"label":"past"},
              {"id":3,"mode":"exact","time":[2026,10,12,11,0],"label":"b"}]}
            """;
        var res = Parse(await d.HandleAsync(msg))["results"]!.AsArray();
        Assert.True((bool)res[0]!["ok"]!);
        Assert.False((bool)res[1]!["ok"]!);
        Assert.Equal("past_time", (string?)res[1]!["reason"]);
        Assert.True((bool)res[2]!["ok"]!);
    }

    [Fact]
    public async Task GetAndCancelAlarms_RoundTrip()
    {
        var d = new BridgeDispatcher("windows", "1", null, new FakeHost(), new AlarmScheduler(), now: () => Now);
        await d.HandleAsync("""
            {"type":"nbl:set-alarms","requestId":"s","alarms":[
              {"id":1,"mode":"clock","time":[10,30],"label":"a"},
              {"id":2,"mode":"exact","time":[2026,10,12,11,0],"label":"b"}]}
            """);
        var list = Parse(await d.HandleAsync("""{"type":"nbl:get-alarms","requestId":"g"}"""))["alarms"]!.AsArray();
        Assert.Equal(2, list.Count);

        var res = Parse(await d.HandleAsync("""{"type":"nbl:cancel-alarms","requestId":"c","ids":[1,99]}"""));
        Assert.Equal("nbl:cancel-alarms-result", (string?)res["type"]);
        Assert.Equal(1, (int)res["removed"]!);
        list = Parse(await d.HandleAsync("""{"type":"nbl:get-alarms","requestId":"g2"}"""))["alarms"]!.AsArray();
        Assert.Single(list);
    }

    [Fact]
    public async Task OpenExternal_AllowsOnlyHttp()
    {
        var host = new FakeHost();
        var d = new BridgeDispatcher("windows", "1", null, host);
        Assert.True((bool)Parse(await d.HandleAsync("""{"type":"nbl:open-external","requestId":"1","url":"https://example.com/"}"""))["ok"]!);
        Assert.False((bool)Parse(await d.HandleAsync("""{"type":"nbl:open-external","requestId":"2","url":"file:///C:/Windows/notepad.exe"}"""))["ok"]!);
        Assert.Single(host.Opened);
    }

    [Fact]
    public async Task Share_JoinsTextAndUrl()
    {
        var host = new FakeHost();
        var d = new BridgeDispatcher("windows", "1", null, host);
        await d.HandleAsync("""{"type":"nbl:share","requestId":"1","title":"T","text":"hello","url":"https://x/"}""");
        Assert.Equal(("T", "hello\nhttps://x/"), host.Shared[0]);
    }
}

public class ProtocolTests
{
    private static readonly Uri Base = new("https://ychsue.github.io/NonBlockingLife/?old=1#x");

    [Theory]
    [InlineData("nonblockinglife://?action=interrupt&name=a%20b", "https://ychsue.github.io/NonBlockingLife/?action=interrupt&name=a%20b")]
    [InlineData("nonblockinglife:?action=x", "https://ychsue.github.io/NonBlockingLife/?action=x")]
    [InlineData("nonblockinglife://open/some/path?a=1#frag", "https://ychsue.github.io/NonBlockingLife/?a=1#frag")]
    [InlineData("NonBlockingLife://", "https://ychsue.github.io/NonBlockingLife/")]
    public void Resolve_MapsToPwaUrl(string raw, string expected)
    {
        var a = ProtocolUri.Resolve(raw, Base);
        Assert.Equal(ProtocolActionKind.Navigate, a!.Kind);
        Assert.Equal(expected, a.Target!.AbsoluteUri);
    }

    [Theory]
    [InlineData("nonblockinglife://show-clock")]
    [InlineData("nonblockinglife://SHOW-CLOCK?x=1")]
    public void Resolve_ShowClock(string raw) =>
        Assert.Equal(ProtocolActionKind.ShowClock, ProtocolUri.Resolve(raw, Base)!.Kind);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("https://evil.example/?a=1")]
    [InlineData("nonblockinglife://?a=1\r\nb")]
    public void Resolve_RejectsInvalid(string? raw) => Assert.Null(ProtocolUri.Resolve(raw, Base));

    [Fact]
    public void Resolve_RejectsTooLong() =>
        Assert.Null(ProtocolUri.Resolve("nonblockinglife://?a=" + new string('x', 3000), Base));

    [Fact]
    public void WindowsCommand_QuotesEverything()
    {
        var c = ProtocolRegistration.ResolveCommand(@"C:\Program Files\dotnet\dotnet.exe", @"C:\x\Nbl.Desktop.dll");
        Assert.Equal("\"C:\\Program Files\\dotnet\\dotnet.exe\" \"C:\\x\\Nbl.Desktop.dll\" \"%1\"",
            ProtocolRegistration.BuildWindowsCommand(c));
    }

    [Fact]
    public void DesktopEntry_DeclaresSchemeHandler() =>
        Assert.Contains("MimeType=x-scheme-handler/nonblockinglife;",
            ProtocolRegistration.BuildDesktopEntry(new[] { "/opt/nbl" }));
}

public class PolicyAndAutoStartTests
{
    [Theory]
    [InlineData("https://example.com/", true)]
    [InlineData("mailto:a@b.c", true)]
    [InlineData("ms-clock:timer?duration=60", true)]
    [InlineData("file:///C:/Windows/notepad.exe", false)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("nonblockinglife://show-clock", false)]
    public void ExternalUriPolicy_AllowsOnlyKnownSchemes(string uri, bool expected) =>
        Assert.Equal(expected, ExternalUriPolicy.IsSafe(new Uri(uri)));

    [Fact]
    public void ResolveCommand_ForNativeExe()
    {
        var c = AutoStart.ResolveCommand(@"C:\Apps\NBL\Nbl.Desktop.exe", null);
        Assert.Equal(new[] { @"C:\Apps\NBL\Nbl.Desktop.exe", "--background" }, c);
    }

    [Fact]
    public void ResolveCommand_ForDotnetHost_IncludesDll()
    {
        var c = AutoStart.ResolveCommand(@"C:\Program Files\dotnet\dotnet.exe", @"C:\x\Nbl.Desktop.dll");
        Assert.Equal(3, c.Count);
        Assert.Equal("\"C:\\Program Files\\dotnet\\dotnet.exe\" C:\\x\\Nbl.Desktop.dll --background", AutoStart.ToCommandLine(c));
    }

    [Fact]
    public void ResolveCommand_DotnetWithoutDll_IsEmpty() =>
        Assert.Empty(AutoStart.ResolveCommand("/usr/bin/dotnet", null));

    [Fact]
    public void DesktopEntry_QuotesPathsWithSpaces()
    {
        var s = AutoStart.BuildDesktopEntry(new[] { "/opt/My App/nbl", "--background" });
        Assert.Contains("Exec=\"/opt/My App/nbl\" --background", s);
    }
}

public class AlarmSchedulerTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 12, 9, 0, 0, TimeZoneInfo.Local.GetUtcOffset(new DateTime(2026, 10, 12)));

    private static JsonArray Alarms(string json) => (JsonArray)JsonNode.Parse(json)!;

    [Fact]
    public void Clock_Alarm_RollsToTomorrowWhenTimeAlreadyPassed()
    {
        var s = new AlarmScheduler();
        s.Set(Alarms("""[{"id":1,"mode":"clock","time":[8,0],"label":"x"}]"""), Now);
        Assert.Equal(Now.AddHours(23), s.Snapshot()[0].FireAt);
    }

    [Fact]
    public void TakeDue_RemovesAndDedupesClockAndExactOfSameItem()
    {
        var s = new AlarmScheduler();
        s.Set(Alarms("""
            [{"id":7,"mode":"clock","time":[10,0],"label":"x"},
             {"id":7,"mode":"exact","time":[2026,10,12,10,0],"label":"x"}]
            """), Now);
        Assert.Empty(s.TakeDue(Now));
        var due = s.TakeDue(Now.AddHours(1));
        Assert.Single(due);
        Assert.Empty(s.Snapshot());
    }

    [Fact]
    public void TakeDue_DropsAlarmsMissedByMoreThanMaxLate()
    {
        var s = new AlarmScheduler();
        s.Set(Alarms("""[{"id":1,"mode":"exact","time":[2026,10,12,10,0],"label":"x"}]"""), Now);
        Assert.Empty(s.TakeDue(Now.AddHours(5)));
        Assert.Empty(s.Snapshot());
    }

    [Fact]
    public void Set_SameIdAndMode_Replaces()
    {
        var s = new AlarmScheduler();
        s.Set(Alarms("""[{"id":1,"mode":"exact","time":[2026,10,12,10,0],"label":"old"}]"""), Now);
        s.Set(Alarms("""[{"id":1,"mode":"exact","time":[2026,10,12,11,0],"label":"new"}]"""), Now);
        var all = s.Snapshot();
        Assert.Single(all);
        Assert.Equal("new", all[0].Label);
    }

    [Fact]
    public void Alarms_SurviveRestart()
    {
        var path = Path.Combine(Path.GetTempPath(), $"nbl-alarms-{Guid.NewGuid():N}.json");
        try
        {
            new AlarmScheduler(path).Set(Alarms("""[{"id":1,"mode":"exact","time":[2026,10,12,10,0],"label":"x"}]"""), Now);
            Assert.Single(new AlarmScheduler(path).Snapshot());
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void CorruptFile_IsIgnored()
    {
        var path = Path.Combine(Path.GetTempPath(), $"nbl-alarms-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, "{not json");
        try { Assert.Empty(new AlarmScheduler(path).Snapshot()); }
        finally { File.Delete(path); }
    }
}
