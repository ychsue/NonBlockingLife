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
        response = handleStart(data.taskId, data.taskName);
        break;
      case "INTERRUPT":
        response = handleInterrupt(data.note || "User Manual Interrupt");
        break;
      case "END":
        response = handleEnd(data.taskId);
        break;
      case "ADD_INBOX":
        response = handleAddInbox(data.title); // TODO TODO TODO
        break;
        // TODO TODO TODO 尚缺 `?��?一?�Task(得�?定哪?�TaskSheet)`, `?�出移�?一??Task?��?求`
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
