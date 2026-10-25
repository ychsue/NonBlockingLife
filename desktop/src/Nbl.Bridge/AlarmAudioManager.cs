namespace Nbl.Bridge;

/// <summary>平台相關的音訊播放（循環播放直到 <see cref="Stop"/>）。</summary>
public interface IAudioPlayer
{
    void PlayLoop(string? sound);
    void Stop();
}

/// <summary>
/// 統一管理鬧鐘／計時器的鈴聲：以 key 追蹤響鈴中的項目，同時只播一個聲音，
/// 所有 key 都停止後才真正停止播放。
/// </summary>
public sealed class AlarmAudioManager
{
    private readonly object _gate = new();
    private readonly HashSet<string> _ringing = new();
    private readonly IAudioPlayer _player;
    private string? _sound;

    public AlarmAudioManager(IAudioPlayer player) => _player = player;

    public bool IsRinging
    {
        get { lock (_gate) return _ringing.Count > 0; }
    }

    public void Start(string key, string? sound = null)
    {
        lock (_gate)
        {
            if (!_ringing.Add(key) || _ringing.Count > 1) return;
            _sound = sound;
            Safe(() => _player.PlayLoop(sound));
        }
    }

    public void Refresh()
    {
        lock (_gate)
        {
            if (_ringing.Count == 0) return;
            Safe(() => _player.PlayLoop(_sound));
        }
    }

    public void Stop(string key)
    {
        lock (_gate)
        {
            if (_ringing.Remove(key) && _ringing.Count == 0)
            {
                _sound = null;
                Safe(_player.Stop);
            }
        }
    }

    public void StopAll()
    {
        lock (_gate)
        {
            if (_ringing.Count == 0) return;
            _ringing.Clear();
            _sound = null;
            Safe(_player.Stop);
        }
    }

    // 音訊裝置問題不應讓鬧鐘流程崩潰
    private static void Safe(Action a)
    {
        try { a(); }
        catch (Exception e)
        {
            System.Diagnostics.Trace.WriteLine($"[nbl] audio error: {e.Message}");
        }
    }
}
