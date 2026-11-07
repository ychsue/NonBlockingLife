using System;
using System.IO;
using ManagedBass;
using Nbl.Bridge;

namespace Nbl.Desktop;

public sealed class BassAudioPlayer : IAudioPlayer
{
    private int _stream;
    private bool _isInitialized;

    private void EnsureInitialized()
    {
        if (_isInitialized) return;
        if (!Bass.Init(-1, 44100,DeviceInitFlags.Default, IntPtr.Zero))
        {
            var error = Bass.LastError;
            if (error != Errors.Already)
            {
                throw new InvalidOperationException($"Bass initialization failed with error code: {error}");
            }
        } else
        {
            int flacPlugin = Bass.PluginLoad("libbassflac.so");
            if (flacPlugin == 0)
            {
                var error = Bass.LastError;
                throw new InvalidOperationException($"Failed to load libbassflac.so with error code: {error}");
            } else
            {
                // Successfully loaded the plugin
            }
        }
        _isInitialized = true;
    }

    public void PlayLoop(string? filePath)
    {
        Stop(); 
        EnsureInitialized();

        var path = !string.IsNullOrEmpty(filePath) && File.Exists(filePath) ? filePath : AudioPlayerFactory.ExtractDefaultSound();

        if (_stream != 0)
        {
            Bass.StreamFree(_stream);
        }
        _stream = Bass.CreateStream(path, 0, 0, BassFlags.Default | BassFlags.Loop);
        if (_stream == 0)
        {
            var error = Bass.LastError;
            throw new InvalidOperationException($"Failed to create stream with error code: {error}");
        }
        Bass.ChannelPlay(_stream, true);
    }
    public void Stop()
    {
        if (_stream != 0)
        {
            if (Bass.ChannelIsActive(_stream) != 0)
                Bass.ChannelStop(_stream);
            Bass.StreamFree(_stream);
            _stream = 0;
        }
    }

}