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

    public event Action<string?>? ShowRequested;

    private SingleInstance(Mutex mutex, string pipeName)
    {
        _mutex = mutex;
        _pipeName = pipeName;
    }

    /// <param name="payload">已有實例時，轉交給它的內容（例如 nonblockinglife:// 連結）。</param>
    /// <returns>取得則回傳實例；已有其他實例執行時回傳 null（並已通知它）。</returns>
    public static SingleInstance? TryAcquire(string? payload = null, string name = "NonBlockingLife.Desktop")
    {
        var user = Environment.UserName.Replace('\\', '_');
        var pipe = $"{name}.{user}";
        var mutex = new Mutex(true, $"{name}.{user}", out var createdNew);
        if (!createdNew)
        {
            mutex.Dispose();
            Notify(pipe, payload);
            return null;
        }
        var instance = new SingleInstance(mutex, pipe);
        _ = instance.ListenAsync();
        return instance;
    }

    private static void Notify(string pipeName, string? payload)
    {
        try
        {
            using var client = new NamedPipeClientStream(".", pipeName, PipeDirection.Out);
            client.Connect(1500);
            var bytes = System.Text.Encoding.UTF8.GetBytes(payload ?? "");
            client.Write(bytes, 0, bytes.Length);
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
                using var ms = new MemoryStream();
                var buf = new byte[1024];
                int n;
                while (ms.Length < 4096 && (n = await server.ReadAsync(buf, _cts.Token)) > 0)
                    ms.Write(buf, 0, n);
                var text = System.Text.Encoding.UTF8.GetString(ms.ToArray());
                ShowRequested?.Invoke(text.Length == 0 ? null : text);
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
