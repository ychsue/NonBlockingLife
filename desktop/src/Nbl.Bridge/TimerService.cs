using System.Text.Json;

namespace Nbl.Bridge;

public enum TimerState { Idle, Running, Paused }

/// <summary>
/// 一個計時器。Running 時以 <see cref="EndAt"/> 計算剩餘時間（不受視窗隱藏、重啟影響）；
/// Idle/Paused 時以 <see cref="Remaining"/> 保存剩餘時間。
/// </summary>
public sealed record TimerEntry(
    string Id,
    string Label,
    TimeSpan Duration,
    TimerState State,
    DateTimeOffset? EndAt,
    TimeSpan Remaining)
{
    public TimeSpan RemainingAt(DateTimeOffset now) => State switch
    {
        TimerState.Running when EndAt is { } e => e > now ? e - now : TimeSpan.Zero,
        _ => Remaining,
    };
}

/// <summary>類似 Google 時鐘的多組計時器：開始、暫停、繼續、重置、刪除，並持久化。</summary>
public sealed class TimerService
{
    private readonly object _gate = new();
    private readonly string? _path;
    private readonly Dictionary<string, TimerEntry> _timers = new();

    public TimerService(string? persistPath = null)
    {
        _path = persistPath;
        Load();
    }

    public IReadOnlyList<TimerEntry> Snapshot()
    {
        lock (_gate) return _timers.Values.OrderBy(t => t.Id).ToList();
    }

    public TimerEntry? Create(TimeSpan duration, string label, DateTimeOffset now, bool start = true)
    {
        if (duration <= TimeSpan.Zero || duration > TimeSpan.FromHours(100)) return null;
        var id = Guid.NewGuid().ToString("N");
        var entry = new TimerEntry(id, label, duration, TimerState.Idle, null, duration);
        lock (_gate)
        {
            _timers[id] = start ? Started(entry, now) : entry;
            Save();
            return _timers[id];
        }
    }

    /// <summary>開始或繼續。</summary>
    public bool Start(string id, DateTimeOffset now) => Update(id, t => t.State == TimerState.Running ? t : Started(t, now));

    public bool Pause(string id, DateTimeOffset now) => Update(id, t =>
        t.State != TimerState.Running ? t : t with { State = TimerState.Paused, EndAt = null, Remaining = t.RemainingAt(now) });

    /// <summary>重置回初始時間並停止。</summary>
    public bool Reset(string id) => Update(id, t => t with { State = TimerState.Idle, EndAt = null, Remaining = t.Duration });

    /// <summary>加一分鐘（Google 時鐘的 +1:00）。</summary>
    public bool AddMinute(string id, DateTimeOffset now) => Update(id, t => t.State == TimerState.Running
        ? t with { EndAt = t.EndAt + TimeSpan.FromMinutes(1) }
        : t with { Remaining = t.Remaining + TimeSpan.FromMinutes(1) });

    public bool Remove(string id)
    {
        lock (_gate)
        {
            if (!_timers.Remove(id)) return false;
            Save();
            return true;
        }
    }

    /// <summary>取出已到時的計時器；它們會回到 Idle（可再按開始重跑）。</summary>
    public IReadOnlyList<TimerEntry> TakeFinished(DateTimeOffset now)
    {
        lock (_gate)
        {
            var done = _timers.Values.Where(t => t.State == TimerState.Running && t.EndAt <= now).ToList();
            if (done.Count == 0) return Array.Empty<TimerEntry>();
            foreach (var t in done)
                _timers[t.Id] = t with { State = TimerState.Idle, EndAt = null, Remaining = t.Duration };
            Save();
            return done;
        }
    }

    private static TimerEntry Started(TimerEntry t, DateTimeOffset now) =>
        t with { State = TimerState.Running, EndAt = now + t.Remaining };

    private bool Update(string id, Func<TimerEntry, TimerEntry> change)
    {
        lock (_gate)
        {
            if (!_timers.TryGetValue(id, out var t)) return false;
            _timers[id] = change(t);
            Save();
            return true;
        }
    }

    private void Load()
    {
        if (_path is null || !File.Exists(_path)) return;
        try
        {
            var list = JsonSerializer.Deserialize<List<TimerEntry>>(File.ReadAllText(_path));
            if (list is null) return;
            foreach (var t in list) _timers[t.Id] = t;
        }
        catch (Exception e) when (e is JsonException or IOException)
        {
            // 檔案損毀時當作沒有計時器
        }
    }

    private void Save()
    {
        if (_path is null) return;
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        var tmp = _path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(_timers.Values.ToList()));
        File.Move(tmp, _path, overwrite: true);
    }
}
