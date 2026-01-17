import { jest } from '@jest/globals';

// 建立一個可重複使用的 Mock 對象
export const mockSheet = {
  getRange: jest.fn().mockReturnThis(),
  getValue: jest.fn(),
  getValues: jest.fn(),
  setValue: jest.fn(),
  setValues: jest.fn(),
  clearContent: jest.fn(),
  appendRow: jest.fn(),
  getDataRange: jest.fn().mockReturnThis(),
};

export const mockSpreadsheet = {
  getSheetByName: jest.fn().mockReturnValue(mockSheet),
  getActiveSpreadsheet: jest.fn().mockReturnThis(),
};

// 將 Mock 掛載到全域環境
global.SpreadsheetApp = mockSpreadsheet;
