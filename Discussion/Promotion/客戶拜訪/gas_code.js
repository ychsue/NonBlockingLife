const TEMPLATE_ID = '1nsEqyV6z0a3LuaEVoIDvS9N_yp7lniDN6MLEIydBmHI';   // ← 你要填入
const TEMPLATE_SHEET_NAME = '客戶基本資料';
const CUSTOMER_LIST_SHEET = '客戶們';

function createCustomerSheet(name, city) {
  Logger.log(JSON.stringify({name, city}))
  const newFile = createNewSpreadsheet(name, city);
  const newSs = SpreadsheetApp.openById(newFile.getId());

  copyTemplateSheet(newSs);
  const newId = appendCustomerToMaster(name, city);
  fillCustomerInfo(newSs, name, city, newId);

  SpreadsheetApp.setActiveSpreadsheet(newSs);
  return newFile.getUrl();
}

/**
 * Step 1: 建立新 Google Sheets
 */
function createNewSpreadsheet(name, city) {
  const title = `客戶_${name}_${city}`;
  return SpreadsheetApp.create(title);
}

/**
 * Step 2: 複製範本的「客戶基本資料」到新 sheet
 */
function copyTemplateSheet(newSs) {
  const template = SpreadsheetApp.openById(TEMPLATE_ID);
  const sheet = template.getSheetByName(TEMPLATE_SHEET_NAME);
  sheet.copyTo(newSs).setName(TEMPLATE_SHEET_NAME);
}

/**
 * Step 3 & 4: 在「客戶們」找到最後一筆 → 編號+1 → 寫入
 */
function appendCustomerToMaster(name, city) {
  const template = SpreadsheetApp.openById(TEMPLATE_ID);
  const sheet = template.getSheetByName(CUSTOMER_LIST_SHEET);

  const lastRow = sheet.getLastRow();
  let maxId = 0;
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues(); // A2:C
    maxId = Math.max(...data.map(r => r[0] || 0));
  }
  const newId = maxId + 1;

  sheet.getRange(lastRow + 1, 1, 1, 3).setValues([[newId, name, city]]);
  return newId;
}

/**
 * Step 5: 在新 sheet 填入 D3 / D5 / W2
 */
function fillCustomerInfo(newSs, name, city, id) {
  const sheet = newSs.getSheetByName(TEMPLATE_SHEET_NAME);
  sheet.getRange('D3').setValue(name);
  sheet.getRange('D5').setValue(city);
  sheet.getRange('W2').setValue(id);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const { name, city } = data;

  const url = createCustomerSheet(name, city);

  return ContentService
    .createTextOutput(JSON.stringify({ url }))
    .setMimeType(ContentService.MimeType.JSON);
}
