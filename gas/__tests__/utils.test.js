import Utils from '../src/Utils.js';

describe('Utils 測試', () => {
  test('generateId 應該回傳 t 開頭的字串', () => {
    expect(Utils.generateId()).toMatch(/^t/);
  });

  test('calculateDuration 應該正確計算分鐘差', () => {
    const start = "2026-01-16T10:00:00";
    const end = "2026-01-16T10:30:00";
    expect(Utils.calculateDuration(start, end)).toBe(30);
  });

});
