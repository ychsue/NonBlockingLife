/**
 * 安裝教學：
 * 1. 請在 GAS 另開一個檔案，比如稱為 exportICS.js
 * 2. 將此檔案的內容複製到新建的 exportICS.js 中。
 * 3. 透過 `服務 +`新增 Drive API 權限。
 * 4. 然後試著跑 `exportICSFiles` 函數，檢查是否能成功匯出 ICS 檔案。
 * 5. 若成功，將會在指定的 Drive 位置生成 ICS 檔案。並且也會在 Google Sheet 裡面直接更新 ics 的路徑。這樣，使用者就可以由 PWA 直接取得 ICS 網址，餵給其他的應用程式使用。
 * 6. 若失敗，請由左邊的 `設定`，勾選顯示 `appsscript.json` 然後輸入 `appsscript.json`的內容，理應可以解決問題。
 * 7. 若想要定時更新 ics 內容好同步更新其他 Calendar 應用程式裡的事件，請設定時間驅動的觸發器來定期執行 `exportICSFiles` 函數。
 */

const ICS_EXPORT_SHEETS = {
	configs: 'NBL_ICSExportConfigs',
	projects: 'NBL_Projects',
	scheduled: 'NBL_Scheduled',
}

/** Run manually once to test, then attach a time-driven trigger to this function. */
function exportICSFiles() {
	const lock = LockService.getScriptLock()
	if (!lock.tryLock(30000)) throw new Error('Another ICS export is already running')

	try {
		const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
		if (!spreadsheet) throw new Error('This script must be bound to the NBL spreadsheet')

		const configRows = icsExportReadRows(spreadsheet, ICS_EXPORT_SHEETS.configs)
		const projects = icsExportReadRows(spreadsheet, ICS_EXPORT_SHEETS.projects).map(function (row) {
			return row.data
		})
		const scheduled = icsExportReadRows(spreadsheet, ICS_EXPORT_SHEETS.scheduled).map(function (row) {
			return row.data
		})
		const generatedAt = new Date()
		const results = []

		configRows.forEach(function (row) {
			const config = row.data
			if (config.enabled !== true) return

			try {
				results.push(icsExportOne(spreadsheet, row, projects, scheduled, generatedAt))
			} catch (error) {
				const message = String(error && error.stack ? error.stack : error)
				Logger.log('ICS export failed for ' + config.id + ': ' + message)
				results.push({ id: config.id, success: false, error: String(error) })
			}
		})

		const failures = results.filter(function (result) { return !result.success })
		if (failures.length) {
			throw new Error(failures.length + ' ICS export(s) failed. See execution log for details.')
		}
		Logger.log(JSON.stringify(results))
		return results
	} finally {
		lock.releaseLock()
	}
}

function icsExportOne(spreadsheet, configRow, projects, scheduled, generatedAt) {
	const config = configRow.data
	const selectedProjects = Array.isArray(config.projectIds) ? config.projectIds : []
	const projectIds = icsExportExpandProjectIds(selectedProjects, projects, config.includeSubProjects === true)
	const daysBefore = icsExportNumberOrDefault(config.timeRangeDaysBefore, 30)
	const daysAfter = icsExportNumberOrDefault(config.timeRangeDaysAfter, 90)
	const startRange = generatedAt.getTime() - daysBefore * 86400000
	const endRange = generatedAt.getTime() + daysAfter * 86400000
	const filtered = scheduled.filter(function (item) {
		if (!Array.isArray(item.projectIds) || !item.projectIds.some(function (id) { return projectIds.has(id) })) return false
		const nextRun = Number(item.nextRun)
		return Number.isFinite(nextRun) && nextRun >= startRange && nextRun <= endRange
	})
	const content = icsExportBuildCalendar(filtered, config, generatedAt)
	const fileName = icsExportFileName(config.fileName)
	const configSheet = spreadsheet.getSheetByName(ICS_EXPORT_SHEETS.configs)
	const blob = Utilities.newBlob(content, 'text/calendar', fileName)
	let file

	if (config.driveFileId) {
		try {
			file = Drive.Files.update(
				{ name: fileName, mimeType: 'text/calendar' },
				config.driveFileId,
				blob,
				{ fields: 'id,name,mimeType,resourceKey' },
			)
		} catch (error) {
			throw new Error('Cannot update the configured Drive file with drive.file scope. Run once with a new export config to create a file owned by this script. ' + error)
		}
	} else {
		file = Drive.Files.create(
			{ name: fileName, mimeType: 'text/calendar' },
			blob,
			{ fields: 'id,name,mimeType,resourceKey' },
		)
		config.driveFileId = file.id
	}

	icsExportEnsurePublicReadPermission(file.id)
	file = Drive.Files.get(file.id, { fields: 'id,name,mimeType,resourceKey' })
	const url = 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(file.id) +
		(file.resourceKey ? '&resourcekey=' + encodeURIComponent(file.resourceKey) : '')

	config.url = url
	config.lastGeneratedAt = generatedAt.getTime()
	config.updatedAt = generatedAt.getTime()
	icsExportWriteConfig(configSheet, configRow, config, generatedAt)

	return { id: config.id, success: true, eventCount: filtered.length, driveFileId: file.id, url: url }
}

function icsExportEnsurePublicReadPermission(fileId) {
	const response = Drive.Permissions.list(fileId, { fields: 'permissions(id,type,role)' })
	const publicPermission = (response.permissions || []).find(function (permission) {
		return permission.type === 'anyone'
	})

	if (!publicPermission) {
		Drive.Permissions.create({ type: 'anyone', role: 'reader' }, fileId, { fields: 'id' })
	} else if (publicPermission.role !== 'reader') {
		Drive.Permissions.update({ role: 'reader' }, fileId, publicPermission.id, { fields: 'id,role' })
	}
}

function icsExportReadRows(spreadsheet, sheetName) {
	const sheet = spreadsheet.getSheetByName(sheetName)
	if (!sheet || sheet.getLastRow() < 2) return []

	return sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues().reduce(function (rows, values, index) {
		if (values[4] === true || String(values[4]).toLowerCase() === 'true') return rows
		let data = {}
		try {
			data = values[2] ? JSON.parse(String(values[2])) : {}
		} catch (error) {
			Logger.log('Invalid payload JSON in ' + sheetName + ' row ' + (index + 2))
			return rows
		}

		data = data && typeof data === 'object' ? data : {}
		data.id = values[1]
		if (sheetName === ICS_EXPORT_SHEETS.scheduled) data.taskId = values[1]
		if (sheetName === ICS_EXPORT_SHEETS.projects) data.id = values[1]
		rows.push({ rowIndex: index + 2, recordId: values[0], data: data, raw: values })
		return rows
	}, [])
}

function icsExportWriteConfig(sheet, configRow, config, generatedAt) {
	const payload = Object.assign({}, config)
	delete payload.id
	const raw = configRow.raw
	sheet.getRange(configRow.rowIndex, 1, 1, 8).setValues([[
		raw[0],
		config.id,
		JSON.stringify(payload),
		generatedAt.getTime(),
		false,
		Utilities.getUuid(),
		'gas-ics-export',
		generatedAt.getTime(),
	]])
	configRow.raw = [raw[0], config.id, JSON.stringify(payload), generatedAt.getTime(), false, '', '', generatedAt.getTime()]
}

function icsExportExpandProjectIds(projectIds, projects, includeSubProjects) {
	const selected = new Set(projectIds)
	if (!includeSubProjects || selected.size === 0) return selected

	const childrenByParent = new Map()
	projects.forEach(function (project) {
		if (!project.parentId) return
		if (!childrenByParent.has(project.parentId)) childrenByParent.set(project.parentId, [])
		childrenByParent.get(project.parentId).push(project.id)
	})

	const pending = Array.from(selected)
	while (pending.length) {
		const parentId = pending.pop()
		;(childrenByParent.get(parentId) || []).forEach(function (childId) {
			if (selected.has(childId)) return
			selected.add(childId)
			pending.push(childId)
		})
	}
	return selected
}

function icsExportBuildCalendar(items, config, generatedAt) {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//YesCirculation-Solutions//NONBLOCKINGLIFE//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'X-WR-CALNAME:' + icsExportEscapeText(config.name || config.fileName || 'NonBlockingLife'),
	]
	const stamp = icsExportFormatDate(generatedAt)

	items.forEach(function (item) {
		const start = Number(item.nextRun)
		if (!Number.isFinite(start)) return
		const end = start + 60000 * icsExportNumberOrDefault(item.focusTime, 30)
		const uid = encodeURIComponent(String(config.id)) + '-' + encodeURIComponent(String(item.taskId)) + '@yescirculation-solutions.com'

		lines.push('BEGIN:VEVENT')
		lines.push('UID:' + uid)
		lines.push('DTSTAMP:' + stamp)
		lines.push('DTSTART:' + icsExportFormatDate(new Date(start)))
		lines.push('DTEND:' + icsExportFormatDate(new Date(end)))
		lines.push('SUMMARY:' + icsExportEscapeText(item.title || ''))
		if (item.note && config.exportPrivateNotes === true) {
			lines.push('DESCRIPTION:' + icsExportEscapeText(item.note))
		}
		lines.push('END:VEVENT')
	})

	lines.push('END:VCALENDAR')
	return lines.map(icsExportFoldLine).join('\r\n') + '\r\n'
}

function icsExportFormatDate(date) {
	return Utilities.formatDate(date, 'UTC', "yyyyMMdd'T'HHmmss'Z'")
}

function icsExportEscapeText(value) {
	return String(value)
		.replace(/\\/g, '\\\\')
		.replace(/\r\n|\r|\n/g, '\\n')
		.replace(/,/g, '\\,')
		.replace(/;/g, '\\;')
}

function icsExportFoldLine(line) {
	let folded = ''
	let byteCount = 0
	for (const character of line) {
		const characterBytes = Utilities.newBlob(character).getBytes().length
		if (byteCount + characterBytes > 75) {
			folded += '\r\n '
			byteCount = 1
		}
		folded += character
		byteCount += characterBytes
	}
	return folded
}

function icsExportFileName(fileName) {
	const name = String(fileName || 'export.ics').trim() || 'export.ics'
	return /\.ics$/i.test(name) ? name : name + '.ics'
}

function icsExportNumberOrDefault(value, defaultValue) {
	if (value === null || value === undefined || value === '') return defaultValue
	const number = Number(value)
	return Number.isFinite(number) ? number : defaultValue
}