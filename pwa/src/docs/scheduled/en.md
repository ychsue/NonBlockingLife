# Scheduled

## Purpose

1. Recording tasks that need to be executed at specific times and reminding the user at those times.
2. This can be a one-time task or a recurring task. You can even set it so that after one task is completed, the user is reminded to switch to another task after a period of time, forming an activity chain.
For example, after doing the laundry, the user is reminded to hang the clothes after a while.
3. Importing ics files from other calendar systems. After importing, the system will automatically parse and add the corresponding tasks.
4. Use the calendar and monthly view to check and manage scheduled tasks.
5. Tasks can also be converted into ics files and shared with other applications for convenient cross-platform management.
6. To avoid sharing private information, you need to set the associated Project before sharing tasks with other applications.
7. The Android APP can set an alarm to remind the user in advance to perform the task.

## Usage

1. Adding:
   1. Click `+Add` to add a new task.
   2. On iPhone, you can place the `NBL Scheduled` shortcut in the Control Center. This way, by swiping down from the top right corner of the phone, you can quickly add a new Scheduled task through the shortcut (an entry will also be added to the iPhone calendar).
2. Deleting: (Not recommended, it is suggested to change to Done instead, so that statistical data is preserved)
   1. Each record has a `Delete` button, or you can swipe left on the phone.
3. Editing:
    1. On the phone, swipe right on the entry to enter the editing screen. After making changes, press `Save`.
    2. On the computer, after making changes, the update will be completed once the focus leaves the field.
    3. The Project ID can be used to categorize the task. This ID is required when exporting ics files, as each ics file should correspond to certain projects. Exporting all may lead to information leakage.
    4. In the Android APP, if `Reminder Offset` is set, the system will remind the user in advance before the `NextRun` time.
    5. By setting the `Callback Action`, another task can be automatically triggered after one task is completed, forming an activity chain. Currently, it can only be set to another Scheduled task.
4. When tasks appear in `Candidates`:
   1. One-time tasks: Appear in `Candidates` at the set time, reminding the user to perform the task.
   2. Recurring tasks: Appear in `Candidates` at each recurring time, reminding the user to perform the task.
   3. Activity chain tasks: Appear in `Candidates` after the first task is completed and a certain period has passed, reminding the user to perform the task.
5. Starting and Ending:
   1. Please select a task from `Candidates` to start. Ending is also done in `Candidates`, and then it will be recorded in the `Log`.
   2. When ending, if it is a one-time task, it will be set to Done.

## Important Fields Explanation

1. `Title`: The title of the task, it is recommended to be concise and clear.
2. `Status`: Determined by `NextRun`, however, if `Status==Done`, it will no longer be considered.
3. `ProjectID`: The project ID to which the task belongs, used to categorize tasks and ensure information security when exporting ics files.
4. `Cron`: **Important**
   1. The setting for recurring tasks, the format is `* * * * *`, representing `minute hour day month week` respectively. You can use `*` to represent any value, or use commas to separate multiple values, or use hyphens to indicate ranges, or use slashes to indicate steps. For detailed usage, please Google Crontab. If it is a one-time task, it is `null`.
   2. Currently, two additional extended syntaxes are supported:
      1. `rN` (relative step, supported in any of the five fields)
         1. It means "starting from the current `baseDate`, every N units once".
         2. For example, if the month field is filled with `r3`, and the current month is May, it will expand to `5,8,11`; if the user completes it in September, the next time will be calculated from September onwards as `9,12`.
         3. This design is suitable for tasks that need to "restart from the current rhythm after missing".
      2. `every` / `@every` (whole relative interval)
         1. Can use `every 30m`, `@every 2h`, or directly use `3d`, `1w`, `1M`.
         2. Means the next execution time = `baseDate + interval`, suitable for pure interval reminders.
   2. When we finish a Scheduled task in `Candidates`, if the task's `Cron` is not `null`, the next `NextRun` will be automatically calculated and updated in the database, thus forming a recurring task.
5. `Remind_Offset`: Set the time to remind in advance or delay, the default unit is minutes.
6. `Remind_Before`: How many minutes before the `NextRun` time to remind the user to do it, so as not to miss it.
7. `Remind_After`: How many minutes after finishing this task in `Candidates` to remind the user. It may be connected to the start of another task, forming an activity chain.
8. `Callback`: The target of the activity chain task, corresponding to the `title`.
9. `Note`: The note of the task, which can record some details or the experience after completing the task.
10. `NextRun`: The next execution time, which is calculated by `Cron` or the set time of a one-time task. `Candidates` will determine whether to show this task based on the `NextRun` time.
