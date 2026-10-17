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
    TimeSpan Remaining,
    string? Sound = null)
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

    public TimerEntry? Create(TimeSpan duration, string label, DateTimeOffset now, bool start = true, string? sound = null)
    {
        if (duration <= TimeSpan.Zero || duration > TimeSpan.FromHours(100)) return null;
        var id = Guid.NewGuid().ToString("N");
        var entry = new TimerEntry(id, label, duration, TimerState.Idle, null, duration, sound);
        lock (_gate)
        {
            _timers[id] = start ? Started(entry, now) : entry;
            Save();
            return _timers[id];
        }
    }

    public TimerEntry? UpdateOrCreateByLabel(string label, TimeSpan duration, DateTimeOffset now, bool start = true)
    {
        lock (_gate)
        {
            // 只比對前六個字元以避免過長的標籤造成不必要的錯誤，若少於六個字元，則比對整個標籤。
            var existing = _timers.Values.FirstOrDefault(t => (t.Label.Length >= 6 ? t.Label[0..6] : t.Label) == (label.Length >= 6 ? label[0..6] : label));
            if (existing is not null)
            {
                var updated = existing with { Duration = duration, Remaining = duration };
                _timers[existing.Id] = start ? Started(updated, now) : updated;
                Save();
                return _timers[existing.Id];
            }
        }
        return Create(duration, label, now, start);
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

    /// <summary>變更計時器的鈴聲（null = 預設）。</summary>
    public bool SetSound(string id, string? sound) => Update(id, t => t with { Sound = sound });

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

    /// <summary>由set-timer Uri 加入一個計時器。</summary>
    /// <param name="uri">set-timer Uri</param>
    /// <param name="now">當前時間</param>
    /// <param name="host">桌面宿主，用於顯示時鐘窗口</param>
    /// <returns>是否成功加入計時器</returns>
    /// <remarks>Uri 必須是 nonblockinglife://set-timer 開頭的連結。</remarks>
    public bool AddFromUri(Uri uri, DateTimeOffset now, IDesktopHost? host)
    {
        if (uri.Scheme != ProtocolUri.Scheme || !uri.Host.Equals("set-timer", StringComparison.OrdinalIgnoreCase))
            return false;
        // 這裡可以解析 query 參數來設定計時器，例如 duration
        // 假設 query 參數有 duration=秒數
        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        if (!int.TryParse(query["duration"], out var seconds)) return false;
        var skipUi = bool.TryParse(query["skipUi"], out var result) && result;
        var title = query["title"] ?? "";
        UpdateOrCreateByLabel(title, TimeSpan.FromSeconds(seconds), now);
        if (!skipUi && host is not null)
            host.ShowClockWindow(1);
        return true;
    }
}
