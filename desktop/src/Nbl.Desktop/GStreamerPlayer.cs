using System.Diagnostics;
using Nbl.Bridge;

namespace Nbl.Desktop;

/*
 * GStreamerPlayer is an implementation of IAudioPlayer using GStreamer.
 * It handles audio playback through the GStreamer multimedia framework.
 * 這個是 flatpak 有提供的
 */
public sealed class GStreamerPlayer : IAudioPlayer
{
    private Process? _process;
    private bool _isStopping;
    private readonly object _lock = new();

    public void PlayLoop(string? sound)
    {
        Stop();
        lock (_lock)
        {
            _isStopping = false;
            // 若沒給，就播放預設的
            var path = !string.IsNullOrEmpty(sound) && File.Exists(sound) ? sound : AudioPlayerFactory.ExtractDefaultSound();

            StartGStreamerProcess(path);
        }
    }

    private void StartGStreamerProcess(string soundPath)
    {
        lock (_lock)
        {
            if (_isStopping) return;
            var psi = new ProcessStartInfo
            {
                FileName = "gst-launch-1.0",
                Arguments = $"playbin uri=\"file://{Path.GetFullPath(soundPath)}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            _process = new Process
            {
                StartInfo = psi,
                EnableRaisingEvents = true
            };
            // 讓_process 重複的跑
            _process.Exited += (sender, e) =>
            {
                if (sender is Process p) p.Dispose();
                StartGStreamerProcess(soundPath);
            };

            _process.Start();
        }
    }

    public void Stop()
    {
        lock (_lock)
        {
            _isStopping = true;
            if (_process != null && !_process.HasExited)
            {
                try
                {
                    _process.Kill();
                }
                catch { }
            }
            _process?.Dispose();
            _process = null;
        }

    }
}