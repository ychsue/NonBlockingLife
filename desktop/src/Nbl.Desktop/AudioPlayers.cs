using Avalonia.Platform;
using Nbl.Bridge;
using NAudio.Wave;

#if LINUX
using NAudio.SoundFile;
using NAudio.Alsa;
#endif

namespace Nbl.Desktop;

/// <summary>沒有可用音訊後端的平台（暫時）：不出聲。</summary>
public sealed class NullAudioPlayer : IAudioPlayer
{
    public void PlayLoop(string? sound) { }
    public void Stop() { }
}

/// <summary>Windows：NAudio 循環播放。sound 為 null 時播放內建 DEFAULT.mp3，否則為檔案路徑。</summary>
public sealed class NAudioPlayer : IAudioPlayer
{
    private IWavePlayer? _output;
    private WaveStream? _reader;

    public void PlayLoop(string? sound)
    {
        Stop();
        var reader = OpenReader(sound);
        IWavePlayer output;
        if (OperatingSystem.IsWindows())
        {
            output = new WasapiPlayerBuilder()
                .WithLatency(20) //延遲20ms
                .Build();
        } else if (OperatingSystem.IsLinux())
        {
            throw new PlatformNotSupportedException("Unsupported platform for audio playback.");
            // output = new AlsaPlayerBuilder()
            //     .Build();
        } else
        {
            throw new PlatformNotSupportedException("Unsupported platform for audio playback.");
        }
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

    private static WaveStream OpenReader(string? sound)
    {
        if (!string.IsNullOrEmpty(sound) && File.Exists(sound))
            return new AudioFileReader(sound);
        // 預設播放內建 DEFAULT.mp3
        if (OperatingSystem.IsWindows())
            return new MediaFoundationReader(ExtractDefaultSound());
        else if (OperatingSystem.IsLinux())
        {
            // using var asset = AssetLoader.Open(new Uri("avares://Nbl.Desktop/Assets/DEFAULT.mp3"));
            // var ms = new MemoryStream();
            // asset.CopyTo(ms);
            // ms.Position = 0;
            // return new Mp3FileReader(ms);
        } else
        {
            throw new PlatformNotSupportedException("Unsupported platform for audio playback.");
        }
        throw new PlatformNotSupportedException("Unsupported platform for audio playback.");
    }

    // MediaFoundationReader 只認檔案路徑／URL，不認 avares://，所以把內建資源落地成暫存檔
    private static string ExtractDefaultSound()
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
