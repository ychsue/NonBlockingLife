function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let response = {};

    switch (action) {
      case "QUERY_OPTIONS":
        response = handleQueryOptions(); // TODO TODO TODO
        break;
      case "START":
        response = handleStart(data.taskId, data.note);
        break;
      case "INTERRUPT":
        response = handleInterrupt(data.note || "User Manual Interrupt");
        break;
      case "END":
        response = handleEnd();
        break;
      case "ADD_INBOX":
        response = handleAddInbox(data.title); // TODO TODO TODO
        break;
        // TODO TODO TODO 尚缺 `新增一個Task(得指定哪個TaskSheet)`, `提出移動一個 Task的要求`
      default:
        response = { status: "error", message: "Unknown action: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
