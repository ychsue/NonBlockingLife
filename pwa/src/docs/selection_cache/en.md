# Candidates

## Purpose

1. List all the tasks that can be done at the moment in order of importance, allowing the user to choose what to do from them.
2. Since the brain is treated as a single-threaded execution thread, only one task is allowed to be executed at a time. Once a task is started, the screen will be locked on that task until it is completed before returning to the selectable state.
3. Interruptions are allowed, and the current task can be interrupted via the API or by pressing ⚡, and then improved into the interrupted task.
4. Both the interrupted and interrupting tasks can be any type of task. Pressing ⚡ can interrupt the current task and choose which interrupting task to enter.
4. Since the interrupting task itself is a task, it can be interrupted at any time regardless of whether a task is running. After it ends, it records why it was interrupted and what was done, and puts it in the `Log`.
5. Through the interrupt button, it can also serve as a portal to enter a certain state or task at any time. If the state or task does not exist, it will create one for you and store it in the corresponding task category for future use and analysis.
6. The status of the current task will be displayed on the screen, allowing the user to know what they are doing.
7. Therefore, this is the most frequently used page.

## Tutorial Video

[Interrupt Feature Tutorial Video](https://youtube.com/shorts/s8k1HbEQ6_Q?feature=share#btn)

## How to Use

1. Select a Task:
    1. Click on a task to bring up a dialog box to record why you want to start this task. After confirming, the task will start executing.
    2. Once confirmed, the screen will remain on the dialog box for executing this task. The top right corner will show how long it has been running until the user clicks `End Task`, at which point the task will end, and the reason for starting the task and what was done will be recorded in the `Log`.
    3. To interrupt a task, click the ⚡ button. It will end the current task and enter the dialog box for the interrupting task. These actions will be recorded in the `Log`.
2. 🔄 Refresh Candidates:
    1. Click the `Refresh Candidates` button to reload tasks from the database and display them sorted by priority.
    2. In principle, the page will automatically refresh whenever you return to it.
3. Quick Assessment:
   1. The higher the item, the more attention it should receive.
   2. Red indicates it is overdue, green indicates it is roughly sufficient for today.
   3. If a task in the `Task Pool` has a `⛔`, it means you don't want to spend much time on it (e.g., social media). If used too much, it will turn gray with a strikethrough, indicating overuse.
   4. Each item shows how much time is left, making it easier to decide whether to do it.
4. Deadline:
   1. You can set a deadline for tasks in the Task Pool, Micro Tasks, and Scheduled sections.
   2. The closer the deadline, the higher the score, and the task will be ranked higher: a countdown badge will be displayed within 7 days, orange for 3 days, highlighted in orange on the day, and red for overdue.
   3. There is a cap on overdue points (+500), so even if a task is long overdue, the system will not force you to deal with it immediately — it is your decision. It is recommended to review periodically to decide whether to continue, postpone, or abandon these overdue tasks.
   4. If the next execution time (Next Run) of a Scheduled task is later than the deadline, a warning area will appear at the top of the candidates page. Clicking on the item will take you directly to the Scheduled edit page to correct the schedule or deadline.
5. Using Shortcuts on iPhone:
   1. Install the `NBL Query` shortcut to open this page (Note: due to iPhone Shortcuts not being able to open PWAs, it will almost always open a new Safari window to display this page, which is unavoidable). This allows you to quickly see which tasks are available and choose what to do.
      1. It is recommended to place it in the iPhone `Control Center`, so you can swipe down from the top right corner of the phone and quickly access this shortcut to open this page.
      2. It is recommended to place it in the `Widgets` on the iPhone `Lock Screen`, so you can see the available tasks directly from the lock screen.
   2. Install the `NBL Interrupt` shortcut to quickly interrupt the current task, so you won't miss it.
      1. It is recommended to place it in the iPhone `Control Center`, so you can swipe down from the top right corner of the phone and quickly access this shortcut to interrupt the current task.
      2. It is recommended to place it in the `Widgets` on the iPhone `Lock Screen`, so you can quickly interrupt the current task directly from the lock screen.
   3. Install the `NBL_Timer` shortcut, which can be used in conjunction with the `Apple Clock` timer function to remind yourself when it's time to work or rest using the Pomodoro Technique.
6. Using the Android App:
   * Directly add the Widget to the home screen, so you can quickly see which tasks are available.
7. Using Interrupts Anytime:
   1. Whenever you want to execute a task or enter a certain state, you can use interrupts to do so, ensuring you won't miss it.
   2. If there are interrupted tasks, they will be highlighted in yellow and pinned to the top of the list, allowing you to easily see which tasks still need to be completed.
   3. If the interrupt is due to a sudden situation and you want to record it but can't think of a name, click the ⚡ button again to enter the interrupt task dialog.
   4. If you want to turn this interrupt into a task or state, click the 🔍 button, provide the name you want, and the system will find it for you. If it doesn't exist, a new task or state will be created.
   5. Therefore, interrupts can be used at any time.
