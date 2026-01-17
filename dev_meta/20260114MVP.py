from am_core.feature.feature_unit import feature_unit
from datetime import datetime, timedelta

class DevMeta20260114MVP:

    @feature_unit(
        id="20260114MVP_kickoff",
        display_name="MVP Kickoff",
        scheduled=datetime(2026, 1, 14, 0, 0),
        duration=timedelta(days=1),
        created_at=datetime(2026, 1, 14, 0, 0),
        completed_at=datetime(2026, 1, 14, 20, 0),
        status="done"
    )
    def kickoff(self):
        pass

    # Step 1: 
    @feature_unit(
        display_name="GAS doPost",
        status="pending",
        depends=[kickoff],
        belongs_to=["MVPstep1"],
        duration=timedelta(days=1),
        notes="建立 Google Apps Script 的 doPost 端點，能夠接收來自 iOS 捷徑的任務狀態更新(JSON格式)。"
    )
    def gas_doPost(self):
        """"
        代辦事項：
        [x] Request (Action: START, TaskID: t123) [Start Task](./Start.md)
        [x] Request (Action: END, TaskID?) [End Task](./End.md)
        [ ] Request (Action: INBOX_ADD, Content)
        [ ] Request (Action: QUERY_DASHBOARD_STATUS)
        [ ] Request (Action: INTERRUPT)
        [ ] Request (Action: QUERY_OPTIONS)
        [ ] Request (Action: ADD_TASK, Title, Category)
        [ ] Request (Action: MOVE_TASK, TaskID, TargetSheet)
        [ ] 每小時觸發 (Hourly Check)
        [ ] Periodic & Async_Await Task Support
        """
        pass
    
    @feature_unit(
        display_name="Google Sheets Integration",
        status="pending",
        depends=[kickoff],
        belongs_to=["MVPstep1"],
        duration=timedelta(days=1),
        notes="""
        建立 Google Apps Script 腳本，能夠接收來自 iOS 捷徑的任務狀態更新，並寫入 Google 試算表。
        包含欄位：Timestamp、Task Name、Status、Duration, Notes 等
        """
    )
    def google_sheets_integration(self):
        pass
    
    @feature_unit(
        display_name="iOS Shortcut",
        status="pending",
        depends=[kickoff],
        belongs_to=["MVPstep1"],
        duration=timedelta(days=1),
        notes="""建立 iOS 捷徑，能夠快速發送當前任務狀態到 GAS 端點。
        建立「開始」、「切換」、「中斷」還有「to Inbox」四個快速按鈕"""
    )
    def ios_shortcut(self):
        pass
    
    # Step 2:
    @feature_unit(
        display_name="GAS Deadlock Dectection MVP",
        status="pending",
        depends=[gas_doPost, google_sheets_integration, ios_shortcut],
        belongs_to=["MVPstep2"],
        duration=timedelta(days=3),
        notes="GAS 定時檢查，若單一任務執行超過設定閥值（如 90min），主動發送提醒。"
    )
    def gas_deadlock_detection(self):
        pass
    
    @feature_unit(
        display_name="State Context",
        status="pending",
        depends=[gas_doPost, google_sheets_integration, ios_shortcut],
        belongs_to=["MVPstep2"],
        duration=timedelta(days=1),
        notes="自動判定當前狀態，切換時詢問「是否需要清空微任務？」"
    )
    def state_context(self):
        pass
    
    @feature_unit(
        display_name="Report Per Hour",
        status="pending",
        depends=[gas_deadlock_detection, state_context],
        belongs_to=["MVPstep2"],
        duration=timedelta(days=1),
        notes="每小時自動彙總「未完成宏任務」清單並推送到手機。(Gmail or iOS Notification?)"
    )
    def report_per_hour(self):
        pass
    
    # Step 3: Data analytics & refinements
    @feature_unit(
        display_name="Data Analytics Dashboard",
        status="pending",
        depends=[report_per_hour],
        belongs_to=["MVPstep3"],
        duration=timedelta(days=2),
        notes="使用 Google Data Studio 或其他工具統計每週「阻塞時間」與「任務分布圖」。"
    )
    def data_analytics_dashboard(self):
        pass
    
    @feature_unit(
        display_name="Async Task Trails",
        status="pending",
        depends=[report_per_hour],
        belongs_to=["MVPstep3"],
        duration=timedelta(days=1)
    )
    def async_task_trails(self):
        """
        目的：增加「異步任務追蹤」：標記等待中的事項，直到接收到回調（Callback）
        TODO TODO TODO 還沒有 Idea
        """
        pass