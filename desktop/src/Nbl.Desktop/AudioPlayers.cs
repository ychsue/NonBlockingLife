using Avalonia.Platform;
using LibVLCSharp.Shared;
using NAudio.Wave;
using Nbl.Bridge;

namespace Nbl.Desktop;

public static class AudioPlayerFactory
{
    // 以執行期的 OS 判斷平台，不需要在 csproj 做條件編譯
    public static IAudioPlayer Create()
    {
        if (OperatingSystem.IsWindows()) return new NAudioPlayer();
        if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS()) return new LibVlcPlayer();
        return new NullAudioPlayer();
    }

    /// <summary>把內建的 DEFAULT.mp3 落地成暫存檔（播放器多半只認檔案路徑，不認 avares://）。</summary>
    internal static string ExtractDefaultSound()
    {
        var path = Path.Combine(Path.GetTempPath(), "NonBlockingLife", "DEFAULT.mp3");
        if (File.Exists(path)) return path;
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        using var asset = AssetLoader.Open(new Uri("avares://Nbl.Desktop/Assets/DEFAULT.mp3"));
        var tmp = path + "." + Environment.ProcessId + ".tmp";
        using (var fs = File.Create(tmp)) asset.CopyTo(fs);
        File.Move(tmp, path, overwrite: true);
        return path;
    }
}

/// <summary>沒有可用音訊後端的平台：不出聲。</summary>
public sealed class NullAudioPlayer : IAudioPlayer
{
    public void PlayLoop(string? sound) { }
    public void Stop() { }
}

/// <summary>Windows：NAudio 循環播放。sound 為 null 時播放內建 DEFAULT.mp3，否則為檔案路徑。</summary>
public sealed class NAudioPlayer : IAudioPlayer
{
    private WaveOutEvent? _output;
    private WaveStream? _reader;

    public void PlayLoop(string? sound)
    {
        Stop();
        var path = !string.IsNullOrEmpty(sound) && File.Exists(sound) ? sound : AudioPlayerFactory.ExtractDefaultSound();
        var reader = new MediaFoundationReader(path);
        var output = new WaveOutEvent();
        try
        {
            output.Init(new LoopStream(reader));
            output.Play();
        }
        catch
        {
            output.Dispose();
            reader.Dispose();
            throw;
        }
        (_reader, _output) = (reader, output);
    }

    public void Stop()
    {
        var (output, reader) = (_output, _reader);
        (_output, _reader) = (null, null);
        output?.Stop();
        output?.Dispose();
        reader?.Dispose();
    }

    private sealed class LoopStream : WaveStream
    {
        private readonly WaveStream _source;
        public LoopStream(WaveStream source) => _source = source;
        public override WaveFormat WaveFormat => _source.WaveFormat;
        public override long Length => _source.Length;
        public override long Position
        {
            get => _source.Position;
            set => _source.Position = value;
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            var total = 0;
            while (total < count)
            {
                var n = _source.Read(buffer, offset + total, count - total);
                if (n == 0)
                {
                    if (_source.Position == 0) break; // 空檔案，避免無窮迴圈
                    _source.Position = 0;
                    continue;
                }
                total += n;
            }
            return total;
        }
    }
}

/// <summary>Linux／macOS：LibVLCSharp 循環播放。需要系統安裝 libvlc（例如 apt install libvlc-dev vlc）。</summary>
public sealed class LibVlcPlayer : IAudioPlayer
{
    private LibVLC? _vlc;
    private MediaPlayer? _player;

    public void PlayLoop(string? sound)
    {
        Stop();
        if (_vlc is null)
        {
            Core.Initialize(); // 找不到 libvlc 時會丟例外，由 AlarmAudioManager 記錄後略過
            _vlc = new LibVLC("--no-video");
        }
        var path = !string.IsNullOrEmpty(sound) && File.Exists(sound) ? sound : AudioPlayerFactory.ExtractDefaultSound();
        using var media = new Media(_vlc, path, FromType.FromPath);
        media.AddOption(":input-repeat=65535");
        _player = new MediaPlayer(media);
        _player.Play();
    }

    public void Stop()
    {
        var player = _player;
        _player = null;
        if (player is null) return;
        player.Stop();
        player.Dispose();
    }
}
