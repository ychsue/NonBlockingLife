using System.IO.Pipes;

namespace Nbl.Desktop;

/// <summary>
/// 單一實例：以具名 Mutex 判斷；第二個實例透過具名管道通知第一個實例顯示視窗後離開。
/// </summary>
public sealed class SingleInstance : IDisposable
{
    private readonly Mutex _mutex;
    private readonly string _pipeName;
    private readonly CancellationTokenSource _cts = new();

    public event Action? ShowRequested;

    private SingleInstance(Mutex mutex, string pipeName)
    {
        _mutex = mutex;
        _pipeName = pipeName;
    }

    /// <returns>取得則回傳實例；已有其他實例執行時回傳 null（並已通知它顯示視窗）。</returns>
    public static SingleInstance? TryAcquire(string name = "NonBlockingLife.Desktop")
    {
        var user = Environment.UserName.Replace('\\', '_');
        var pipe = $"{name}.{user}";
        var mutex = new Mutex(true, $"{name}.{user}", out var createdNew);
        if (!createdNew)
        {
            mutex.Dispose();
            Notify(pipe);
            return null;
        }
        var instance = new SingleInstance(mutex, pipe);
        _ = instance.ListenAsync();
        return instance;
    }

    private static void Notify(string pipeName)
    {
        try
        {
            using var client = new NamedPipeClientStream(".", pipeName, PipeDirection.Out);
            client.Connect(1500);
            client.WriteByte(1);
        }
        catch (Exception e) when (e is TimeoutException or IOException)
        {
            // 第一個實例可能正在啟動或關閉，無法通知時就靜默離開
        }
    }

    private async Task ListenAsync()
    {
        while (!_cts.IsCancellationRequested)
        {
            try
            {
                await using var server = new NamedPipeServerStream(
                    _pipeName, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
                await server.WaitForConnectionAsync(_cts.Token);
                var buf = new byte[1];
                if (await server.ReadAsync(buf, _cts.Token) > 0) ShowRequested?.Invoke();
            }
            catch (OperationCanceledException) { return; }
            catch (IOException) { await Task.Delay(500); }
        }
    }

    public void Dispose()
    {
        _cts.Cancel();
        try { _mutex.ReleaseMutex(); } catch (ApplicationException) { }
        _mutex.Dispose();
    }
}
