const SS_ID = "你的範本ID";
const TEMPLATE_SHEET_NAME = "客戶基本資料";
const CUSTOMER_LIST_SHEET = "客戶們";

function createCustomerSheet(name, city) {
  const ss =SpreadsheetApp.getActiveSpreadsheet();
  // const ss = SpreadsheetApp.openById(SS_ID);

  // Step 1: 複製範本成新工作表
  const template = ss.getSheetByName(TEMPLATE_SHEET_NAME);
  const newSheet = template.copyTo(ss).setName(`客戶_${name}_${city}`);
  const gid = newSheet.getSheetId();

  // Step 2: 在客戶們新增一列
  const listSheet = ss.getSheetByName(CUSTOMER_LIST_SHEET);
  const lastRow = listSheet.getLastRow();
  let maxId = 0;
  if (lastRow >= 2) {
    const data = listSheet.getRange(2, 1, lastRow - 1, 3).getValues();
    maxId = Math.max(...data.map((r) => r[0] || 0));
  }
  const newId = maxId + 1;

  const link = `#gid=${gid}`;
  listSheet
    .getRange(lastRow + 1, 1, 1, 4)
    .setValues([[newId, name, city, `=HYPERLINK("${link}", "打開")`]]);

  // Step 3: 填入客戶資料
  newSheet.getRange("D3").setValue(name);
  newSheet.getRange("D5").setValue(city);
  newSheet.getRange("W2").setValue(newId);

  // Step 4: 回傳可直接跳到該工作表的 URL
  const url = `https://docs.google.com/spreadsheets/d/${SS_ID}/edit#gid=${gid}`;
  return url;
}

function doPost(e) {
  const { name, city } = JSON.parse(e.postData.contents);
  const url = createCustomerSheet(name, city);
  return ContentService.createTextOutput(JSON.stringify({ url })).setMimeType(
    ContentService.MimeType.JSON,
  );
}
