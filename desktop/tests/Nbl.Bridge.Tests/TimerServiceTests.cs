using Nbl.Bridge;
using Xunit;

namespace Nbl.Bridge.Tests;

public class TimerServiceTests
{
    private static readonly DateTimeOffset T0 = new(2026, 10, 12, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Create_RejectsNonPositiveDuration()
    {
        var s = new TimerService();
        Assert.Null(s.Create(TimeSpan.Zero, "x", T0));
    }

    [Fact]
    public void Start_ComputesRemainingFromEndAt()
    {
        var s = new TimerService();
        var t = s.Create(TimeSpan.FromMinutes(5), "x", T0)!;
        Assert.Equal(TimerState.Running, t.State);
        Assert.Equal(TimeSpan.FromMinutes(4), t.RemainingAt(T0.AddMinutes(1)));
    }

    [Fact]
    public void Pause_FreezesRemaining_AndResumeContinues()
    {
        var s = new TimerService();
        var t = s.Create(TimeSpan.FromMinutes(5), "x", T0)!;
        s.Pause(t.Id, T0.AddMinutes(2));
        var paused = s.Snapshot().Single();
        Assert.Equal(TimerState.Paused, paused.State);
        Assert.Equal(TimeSpan.FromMinutes(3), paused.RemainingAt(T0.AddHours(1)));

        s.Start(t.Id, T0.AddMinutes(10));
        var resumed = s.Snapshot().Single();
        Assert.Equal(T0.AddMinutes(13), resumed.EndAt);
    }

    [Fact]
    public void Reset_RestoresDurationAndStops()
    {
        var s = new TimerService();
        var t = s.Create(TimeSpan.FromMinutes(5), "x", T0)!;
        s.Pause(t.Id, T0.AddMinutes(2));
        s.Reset(t.Id);
        var r = s.Snapshot().Single();
        Assert.Equal(TimerState.Idle, r.State);
        Assert.Equal(TimeSpan.FromMinutes(5), r.Remaining);
    }

    [Fact]
    public void AddMinute_ExtendsRunningAndPaused()
    {
        var s = new TimerService();
        var t = s.Create(TimeSpan.FromMinutes(1), "x", T0)!;
        s.AddMinute(t.Id, T0);
        Assert.Equal(T0.AddMinutes(2), s.Snapshot().Single().EndAt);
        s.Pause(t.Id, T0);
        s.AddMinute(t.Id, T0);
        Assert.Equal(TimeSpan.FromMinutes(3), s.Snapshot().Single().Remaining);
    }

    [Fact]
    public void TakeFinished_ReturnsOnceAndResetsToIdle()
    {
        var s = new TimerService();
        var t = s.Create(TimeSpan.FromSeconds(30), "x", T0)!;
        Assert.Empty(s.TakeFinished(T0.AddSeconds(29)));
        var done = s.TakeFinished(T0.AddSeconds(30));
        Assert.Single(done);
        Assert.Empty(s.TakeFinished(T0.AddMinutes(5)));
        var after = s.Snapshot().Single();
        Assert.Equal(TimerState.Idle, after.State);
        Assert.Equal(TimeSpan.FromSeconds(30), after.Remaining);
    }

    [Fact]
    public void Persists_RunningTimerAcrossRestart()
    {
        var path = Path.Combine(Path.GetTempPath(), $"nbl-timers-{Guid.NewGuid():N}.json");
        try
        {
            var s1 = new TimerService(path);
            var t = s1.Create(TimeSpan.FromMinutes(5), "x", T0)!;
            var s2 = new TimerService(path);
            var loaded = s2.Snapshot().Single();
            Assert.Equal(t.Id, loaded.Id);
            Assert.Equal(TimerState.Running, loaded.State);
            Assert.Single(s2.TakeFinished(T0.AddMinutes(6)));
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public void Remove_DeletesTimer()
    {
        var s = new TimerService();
        var t = s.Create(TimeSpan.FromMinutes(1), "x", T0)!;
        Assert.True(s.Remove(t.Id));
        Assert.False(s.Remove(t.Id));
        Assert.Empty(s.Snapshot());
    }
}
