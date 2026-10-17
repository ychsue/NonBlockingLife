namespace Nbl.Desktop;

using System.Globalization;
public static class L10n
{
    public static string CurrentLanguage { get; } = GetCurrentLanguage();

    private static string GetCurrentLanguage()
    {
        try
        {
            var name = CultureInfo.CurrentCulture.Name;

            if (name.StartsWith("zh", StringComparison.OrdinalIgnoreCase))
            {
                return "zh-TW";
            }
            else if (name.StartsWith("ja", StringComparison.OrdinalIgnoreCase))
            {
                return "ja";
            }

        }
        catch
        {
            // Ignore any exceptions and fall back to English
        }
        return "en";
    }

    public static string Tray1Title =>
        CurrentLanguage switch
        {
            "zh-TW" => "開啟 NonBlockingLife",
            "ja" => "NonBlockingLifeを開く",
            _ => "Open NonBlockingLife"
        };

    public static string Tray2Title =>
        CurrentLanguage switch
        {
            "zh-TW" => "鬧鐘與計時器",
            "ja" => "アラームとタイマー",
            _ => "Alarms and Timers"
        };

    public static string Tray3Title =>
        CurrentLanguage switch
        {
            "zh-TW" => "開機時自動啟動",
            "ja" => "起動時に自動的に開始",
            _ => "Auto Start on Boot"
        };

    public static string Tray4Title =>
        CurrentLanguage switch
        {
            "zh-TW" => "註冊 nonblockinglife:// 連結",
            "ja" => "nonblockinglife:// リンクを登録",
            _ => "Register nonblockinglife:// Link"
        };

    public static string TrayExitTitle =>
        CurrentLanguage switch
        {
            "zh-TW" => "結束",
            "ja" => "終了",
            _ => "Exit"
        };
    public static string CannotSetAutoStart =>
        CurrentLanguage switch
        {
            "zh-TW" => "無法設定開機自動啟動",
            "ja" => "起動時に自動的に開始できません",
            _ => "Cannot set auto start on boot"
        };

    public static string CannotRegisterProtocol =>
        CurrentLanguage switch
        {
            "zh-TW" => "無法註冊 nonblockinglife:// 連結",
            "ja" => "nonblockinglife:// リンクを登録できません",
            _ => "Cannot register nonblockinglife:// link"
        };

    public static string TimerFinished =>
        CurrentLanguage switch
        {
            "zh-TW" => "計時結束",
            "ja" => "タイマー終了",
            _ => "Timer Finished"
        };

    public static string CW_Alarm =>
        CurrentLanguage switch
        {
            "zh-TW" => "鬧鐘",
            "ja" => "アラーム",
            _ => "Alarm"
        };
    public static string CW_Timer =>
        CurrentLanguage switch
        {
            "zh-TW" => "計時器",
            "ja" => "タイマー",
            _ => "Timer"
        };

    public static string CW_NewAlarmLabel =>
        CurrentLanguage switch
        {
            "zh-TW" => "新鬧鐘標籤",
            "ja" => "新しいアラームのラベル",
            _ => "New Alarm Label"
        };

    public static string CW_AddAlarm =>
        CurrentLanguage switch
        {
            "zh-TW" => "新增鬧鐘",
            "ja" => "アラームを追加",
            _ => "Add Alarm"
        };

    public static string CW_NewTimerLabel =>
        CurrentLanguage switch
        {
            "zh-TW" => "新計時器標籤",
            "ja" => "新しいタイマーのラベル",
            _ => "New Timer Label"
        };

    public static string CW_AddTimer =>
        CurrentLanguage switch
        {
            "zh-TW" => "新增並開始",
            "ja" => "追加して開始",
            _ => "Add and Start"
        };

    public static string Hour =>
        CurrentLanguage switch
        {
            "zh-TW" => "時",
            "ja" => "時",
            _ => "Hour"
        };
    public static string Minute =>
        CurrentLanguage switch
        {
            "zh-TW" => "分",
            "ja" => "分",
            _ => "Minute"
        };

    public static string Second =>
        CurrentLanguage switch
        {
            "zh-TW" => "秒",
            "ja" => "秒",
            _ => "Second"
        };

    public static string CW_NoAlarm =>
        CurrentLanguage switch
        {
            "zh-TW" => "目前沒有鬧鐘",
            "ja" => "現在アラームはありません",
            _ => "No Alarms"
        };

    public static string CW_NoTimer =>
        CurrentLanguage switch
        {
            "zh-TW" => "目前沒有計時器",
            "ja" => "現在タイマーはありません",
            _ => "No Timers"
        };
    
    public static string Pause =>
        CurrentLanguage switch
        {
            "zh-TW" => "暫停",
            "ja" => "一時停止",
            _ => "Pause"
        };

    public static string Resume =>
        CurrentLanguage switch
        {
            "zh-TW" => "繼續",
            "ja" => "再開",
            _ => "Resume"
        };

    public static string Start =>
        CurrentLanguage switch
        {
            "zh-TW" => "開始",
            "ja" => "開始",
            _ => "Start"
        };

    public static string Reset =>
        CurrentLanguage switch
        {
            "zh-TW" => "重置",
            "ja" => "リセット",
            _ => "Reset"
        };

    public static string Delete =>
        CurrentLanguage switch
        {
            "zh-TW" => "刪除",
            "ja" => "削除",
            _ => "Delete"
        };

    public static string CopiedToClipboard =>
        CurrentLanguage switch
        {
            "zh-TW" => "已複製到剪貼簿",
            "ja" => "クリップボードにコピーされました",
            _ => "Copied to Clipboard"
        };
}