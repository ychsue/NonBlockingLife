using System.Text.Json;
using System.Text.Json.Nodes;

namespace Nbl.Bridge;

public sealed record AlarmEntry(string Key, int? Id, string Mode, DateTimeOffset FireAt, string Label);

public sealed record AlarmSetResult(int? Id, string Mode, bool Ok, string? Reason = null);

/// <summary>
/// 桌面端自帶的鬧鐘排程：PWA 以 nbl:set-alarms 交付，這裡負責持久化與到期判斷。
/// 計時器由 shell 驅動（呼叫 <see cref="TakeDue"/>），因此視窗隱藏到系統匣時仍會響。
/// </summary>
public sealed class AlarmScheduler
{
    private readonly object _gate = new();
    private readonly string? _path;
    private readonly Dictionary<string, AlarmEntry> _entries = new();

    /// <param name="persistPath">null 表示只存在記憶體（測試用）。</param>
    public AlarmScheduler(string? persistPath = null)
    {
        _path = persistPath;
        Load();
    }

    public IReadOnlyList<AlarmEntry> Snapshot()
    {
        lock (_gate) return _entries.Values.OrderBy(e => e.FireAt).ToList();
    }

    public IReadOnlyList<AlarmSetResult> Set(JsonArray alarms, DateTimeOffset now)
    {
        var results = new List<AlarmSetResult>();
        lock (_gate)
        {
            foreach (var node in alarms)
            {
                if (node is not JsonObject a) continue;
                var id = a["id"]?.GetValue<int>();
                var mode = a["mode"]?.GetValue<string>() ?? "exact";
                var label = a["label"]?.GetValue<string>() ?? "";
                var time = a["time"] as JsonArray;

                var fireAt = ResolveTime(mode, time, now);
                if (fireAt is null)
                {
                    results.Add(new AlarmSetResult(id, mode, false, "invalid_time"));
                    continue;
                }
                if (fireAt <= now)
                {
                    results.Add(new AlarmSetResult(id, mode, false, "past_time"));
                    continue;
                }

                var key = id is null ? Guid.NewGuid().ToString("N") : $"{id}:{mode}";
                _entries[key] = new AlarmEntry(key, id, mode, fireAt.Value, label);
                results.Add(new AlarmSetResult(id, mode, true));
            }
            Save();
        }
        return results;
    }

    /// <summary>
    /// 取出已到期的鬧鐘並移除。同一個項目（相同 Id 與時間）的 clock/exact 只回傳一筆。
    /// 逾期超過 <paramref name="maxLate"/> 的視為過期直接丟棄（例如關機期間錯過的）。
    /// </summary>
    public IReadOnlyList<AlarmEntry> TakeDue(DateTimeOffset now, TimeSpan? maxLate = null)
    {
        var limit = maxLate ?? TimeSpan.FromHours(1);
        lock (_gate)
        {
            var due = _entries.Values.Where(e => e.FireAt <= now).OrderBy(e => e.FireAt).ToList();
            if (due.Count == 0) return Array.Empty<AlarmEntry>();
            foreach (var e in due) _entries.Remove(e.Key);
            Save();
            return due
                .Where(e => now - e.FireAt <= limit)
                .GroupBy(e => (e.Id, e.FireAt))
                .Select(g => g.First())
                .ToList();
        }
    }

    /// <summary>移除指定 key 的鬧鐘；回傳是否有移除。</summary>
    public bool Remove(string key)
    {
        lock (_gate)
        {
            if (!_entries.Remove(key)) return false;
            Save();
            return true;
        }
    }

    /// <summary>依 PWA 的鬧鐘 id 移除（clock 與 exact 都會移除）；回傳移除數量。</summary>
    public int RemoveByIds(IEnumerable<int> ids)
    {
        var set = ids.ToHashSet();
        lock (_gate)
        {
            var keys = _entries.Values.Where(e => e.Id is int i && set.Contains(i)).Select(e => e.Key).ToList();
            foreach (var k in keys) _entries.Remove(k);
            if (keys.Count > 0) Save();
            return keys.Count;
        }
    }

    private static DateTimeOffset? ResolveTime(string mode, JsonArray? time, DateTimeOffset now)
    {
        try
        {
            if (mode == "clock" && time is { Count: >= 2 })
            {
                var local = now.ToLocalTime();
                var next = new DateTimeOffset(local.Year, local.Month, local.Day,
                    time[0]!.GetValue<int>(), time[1]!.GetValue<int>(), 0, local.Offset);
                return next <= now ? next.AddDays(1) : next;
            }
            if (mode == "exact" && time is { Count: >= 5 })
            {
                var dt = new DateTime(time[0]!.GetValue<int>(), time[1]!.GetValue<int>(), time[2]!.GetValue<int>(),
                    time[3]!.GetValue<int>(), time[4]!.GetValue<int>(), 0, DateTimeKind.Local);
                return new DateTimeOffset(dt);
            }
        }
        catch (Exception e) when (e is ArgumentException or InvalidOperationException or FormatException)
        {
        }
        return null;
    }

    private void Load()
    {
        if (_path is null || !File.Exists(_path)) return;
        try
        {
            var list = JsonSerializer.Deserialize<List<AlarmEntry>>(File.ReadAllText(_path));
            if (list is null) return;
            foreach (var e in list) _entries[e.Key] = e;
        }
        catch (Exception e) when (e is JsonException or IOException)
        {
            // 檔案損毀時當作沒有鬧鐘，不阻擋啟動
        }
    }

    private void Save()
    {
        if (_path is null) return;
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        var tmp = _path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(_entries.Values.ToList()));
        File.Move(tmp, _path, overwrite: true);
    }
}
