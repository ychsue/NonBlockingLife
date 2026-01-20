# Scheduled Task 的設計

## [2026-01-20] ychsue 很好，我們可以先想一下 Scheduled 怎麼用嗎？也就是說，當使用者START後，比如洗衣服，洗衣機開始跑後，就END他嗎？然後就會開始呼叫callback (給 task Id 嗎？)，加一個 固定時間的schedule(iPhone這端有可能啟動計時器來計時嗎？) ，時間到，就START這個晾衣服的 scheduled task ，然後就是正常的 END 程序

請問您的意思是這樣嗎？有 mermaid sequencediagram 對於解釋會有幫助嗎？謝謝。

## Germini Answer 01
