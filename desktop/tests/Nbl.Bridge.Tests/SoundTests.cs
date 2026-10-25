using System.Text.Json.Nodes;
using Nbl.Bridge;
using Xunit;

namespace Nbl.Bridge.Tests;

public class SoundTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 17, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void AlarmAudioManager_RefreshRestartsActiveSound()
    {
        var player = new RecordingAudioPlayer();
        var manager = new AlarmAudioManager(player);

        manager.Start("timer", "timer.mp3");
        manager.Refresh();

        Assert.Equal(new string?[] { "timer.mp3", "timer.mp3" }, player.PlayedSounds);
        Assert.True(manager.IsRinging);

        manager.StopAll();
        manager.Refresh();
        Assert.False(manager.IsRinging);
        Assert.Equal(1, player.StopCount);
    }

    [Fact]
    public void Timer_SetSound_updates_entry_and_survives_reset()
    {
        var s = new TimerService();
        var t = s.Create(TimeSpan.FromMinutes(1), "x", Now, start: false, sound: "a.mp3")!;
        Assert.Equal("a.mp3", t.Sound);

        Assert.True(s.SetSound(t.Id, "b.mp3"));
        s.Reset(t.Id);
        Assert.Equal("b.mp3", s.Snapshot()[0].Sound);

        Assert.True(s.SetSound(t.Id, null));
        Assert.Null(s.Snapshot()[0].Sound);
        Assert.False(s.SetSound("missing", "c.mp3"));
    }

    [Fact]
    public void Alarm_sound_is_read_from_request_and_can_be_changed()
    {
        var a = new AlarmScheduler();
        var item = new JsonObject
        {
            ["mode"] = "clock",
            ["time"] = new JsonArray(11, 0),
            ["label"] = "l",
            ["sound"] = "a.mp3",
        };
        a.Set(new JsonArray(item), Now);
        var e = a.Snapshot()[0];
        Assert.Equal("a.mp3", e.Sound);

        Assert.True(a.SetSound(e.Key, null));
        Assert.Null(a.Snapshot()[0].Sound);
        Assert.False(a.SetSound("missing", "x"));
    }

    private sealed class RecordingAudioPlayer : IAudioPlayer
    {
        public List<string?> PlayedSounds { get; } = new();
        public int StopCount { get; private set; }

        public void PlayLoop(string? sound) => PlayedSounds.Add(sound);
        public void Stop() => StopCount++;
    }
}
