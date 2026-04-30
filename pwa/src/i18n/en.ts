// English — this is the reference/base translation.
// All other language files must satisfy Record<keyof typeof en, string>.
export const en = {
  // ── EditDialog ────────────────────────────────────────────────
  'dialog.cancel':     'Cancel',
  'dialog.save':       'Save',
  'dialog.saving':     'Saving...',
  'dialog.saveFailed': 'Save failed',
  'dialog.select':     'Select',  // prefix used as "Select {label}"

  // ── Toolbar / status ─────────────────────────────────────────
  'candidates.refresh':    'Refresh',
  'candidates.refreshing': 'Refreshing...',
  'candidates.interrupt':  'Interrupt',
  'candidates.help':       'Help',
  'candidates.count':      '{n} candidates',
  'candidates.loading':    'Loading...',
  'candidates.empty':      'No candidates. Click Refresh to load.',
  'candidates.warnAlreadyRunning': 'Please end the current task first.',

  // ── Column headers ───────────────────────────────────────────
  'col.taskId':  'Task ID',
  'col.title':   'Title',
  'col.score':   'Score',
  'col.source':  'Source',
  'col.unknown': 'Unknown',

  // ── Deadline / count badges ───────────────────────────────────
  'badge.overdue':    '{n}d overdue',
  'badge.dueToday':   'Due today',
  'badge.dueDays':    'In {n}d',
  'badge.todayCount': '{n}x today',

  // ── Conflict warning ──────────────────────────────────────────
  'conflict.warning': '{n} scheduled task(s) past deadline',
  'conflict.hint':    '(click to edit)',

  // ── End Task dialog ───────────────────────────────────────────
  'endTask.title':          'End Task',
  'endTask.nowRunning':     'Now running: ',
  'endTask.elapsed':        'Elapsed: {time}',
  'endTask.noteLabel':      'End note (optional)',
  'endTask.notePlaceholder':'Enter end note...',
  'endTask.confirmBtn':     'End Task',
  'endTask.noTask':         'No task in progress',

  // ── Start Task dialog ─────────────────────────────────────────
  'startTask.title':           'Start Task',
  'startTask.taskId':          'Task ID',
  'startTask.taskTitle':       'Title',
  'startTask.noteLabel':       'Note (optional)',
  'startTask.notePlaceholder': 'Enter start note...',
  'startTask.cancelBtn':       'Cancel',
  'startTask.logOnlyBtn':      'Log only',
  'startTask.confirmBtn':      'Start Task',

  // ── Log-only (record) dialog ──────────────────────────────────
  'recordOnly.title':           'Log Event Only',
  'recordOnly.task':            'Task',
  'recordOnly.durationLabel':   'Duration (min, optional)',
  'recordOnly.noteLabel':       'Note (optional)',
  'recordOnly.backBtn':         'Back',
  'recordOnly.confirmBtn':      'Confirm',

  // ── SyncStatus ────────────────────────────────────────────────
  'sync.cancel':               'Cancel',
  'sync.confirmRestore':       'Confirm Restore',
  'sync.confirmRestoreWithLog':'Confirm Restore (+ Log)',

  // ── TableCard ────────────────────────────────────────────────
  'tableCard.edit':                'Edit',
  'tableCard.delete':              'Delete',
  'tableCard.openLink':            'Open Link',
  'tableCard.swipeDeleteConfirm':  'Swipe left again to confirm delete',
  'tableCard.confirmDelete':       'Confirm Delete',

  // ── Inbox move/toast ─────────────────────────────────────────
  'inbox.movedTo':            'Moved to {target}',
  'inbox.moveRestored':       'Move restored',
  'inbox.undoFailed':         'Undo failed: {msg}',
  'inbox.moveFailed':         'Move failed: {msg}',

  // ── LogTable ─────────────────────────────────────────────────
  'log.confirmClear':         'Are you sure you want to clear all change_log records related to Log?',
  'log.clearedCount':         'Cleared {count} Log change_log records',
  'log.clearFailed':          'Clear failed, please check console',
  'log.dayOption':            '{n} day(s)',

  // ── SetupWizard alerts ───────────────────────────────────────
  'setup.invalidGasUrl':      'Please enter a valid GAS Web App URL',
  'setup.connectFailed':      'Connection failed, please check whether the URL is correct',
  'setup.codeCopied':         'Apps Script code has been copied to clipboard. Please open the Apps Script editor in Google Sheets and paste it.',

  // ── Table pages (common) ─────────────────────────────────────
  'table.help':               'Help',
  'table.open':               'Open',
  'table.loading':            'Loading...',
  'table.add':                '+ Add',
  'table.noItemsYet':         'No items yet.',
  'table.noMatchingItems':    'No matching items.',
  'table.empty':              '(empty)',
  'table.notSet':             '(not set)',
  'table.notRun':             '(not run yet)',

  // ── Table card labels ────────────────────────────────────────
  'card.receivedAt':          'Received At',
  'card.lastRun':             'Last Run',
  'card.focusTime':           'Focus Time',
  'card.status':              'Status',
  'card.priority':            'Priority',
  'card.dailyLimit':          'Daily Limit',
  'card.spentToday':          'Spent Today',
  'card.cron':                'Cron',
  'card.nextRun':             'Next Run',
  'card.category':            'Category',
  'card.received':            'Received',
  'card.note':                'Note',
  'card.default30Mins':       '(default 30)',
  'card.default30MinsUnit':   '{n} mins',
  'card.untitled':            '(Untitled)',
  'card.noCategory':          '(No category)',
  'card.noDate':              '(No date)',
  'card.noNote':              '(No note)',

  // ── InboxTable ───────────────────────────────────────────────
  'inbox.subtitle':           'Capture ideas and todos',
  'inbox.empty':              'No items yet.',
  'inbox.editTitle':          'Edit Inbox Item',
  'inbox.titlePlaceholder':   'Enter task title',
  'inbox.movePlaceholder':    'Move...',
  'inbox.helpTitle':          'Inbox Guide',

  // ── MicroTasksTable ──────────────────────────────────────────
  'micro.subtitle':           'Finish small tasks quickly',
  'micro.searchPlaceholder':  'Search Title, URL...',
  'micro.hideDone':           'Hide Done',
  'micro.editTitle':          'Edit Micro Task',
  'micro.titlePlaceholder':   'Enter task title',
  'micro.helpTitle':          'Micro Tasks Guide',

  // ── ResourceTable ────────────────────────────────────────────
  'resource.subtitle':            'External reference resources',
  'resource.searchPlaceholder':   'Search Title, Category, Note, URL...',
  'resource.editTitle':           'Edit Resource',
  'resource.titlePlaceholder':    'Enter resource title',
  'resource.categoryPlaceholder': 'e.g., Tutorial, Reference',
  'resource.notePlaceholder':     'Add notes',
  'resource.helpTitle':           'Resources Guide',
  'resource.empty':               'No resources yet.',
  'resource.noMatch':             'No matching resources.',

  // ── TaskPoolTable ────────────────────────────────────────────
  'taskPool.subtitle':         'Task priority and time management',
  'taskPool.searchPlaceholder':'Search Title, Note, Project, URL...',
  'taskPool.hideDone':         'Hide Done',
  'taskPool.editTitle':        'Edit Task Pool Item',
  'taskPool.titlePlaceholder': 'Enter task title',
  'taskPool.helpTitle':        'Task Pool Guide',

  // ── ScheduledTable ───────────────────────────────────────────
  'scheduled.subtitle':          'Recurring task settings',
  'scheduled.searchPlaceholder': 'Search Title, Note, Callback, URL...',
  'scheduled.hideDone':          'Hide Done',
  'scheduled.editTitle':         'Edit Scheduled Task',
  'scheduled.titlePlaceholder':  'Enter task title',
  'scheduled.cronPlaceholder':   'e.g., 0 9 * * *',
  'scheduled.helpTitle':         'Scheduled Guide',
  'scheduled.cronHeader':        'Cron (min hour day month week)',
  'scheduled.cronMinute':        'Minute',
  'scheduled.cronHour':          'Hour',
  'scheduled.cronDay':           'Day',
  'scheduled.cronMonth':         'Month',
  'scheduled.cronWeekday':       'Weekday',

  // ── LogTable ─────────────────────────────────────────────────
  'log.total':                '{n} records',
  'log.clearing':             'Clearing...',
  'log.clearBtn':             'Clear Log ChangeLog',
  'log.recent':               'Recent:',
  'log.search':               'Search:',
  'log.searchPlaceholder':    'Title, task ID, action, notes...',
  'log.clearSearch':          'Clear search',
  'log.empty':                'No records',

  // ── Language toggle (shows the OTHER language label) ──────────
  'lang.toggle': '中文',
} as const
