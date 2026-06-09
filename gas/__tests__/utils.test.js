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

  test('getNextOccurrence 應支援 every 前綴的相對時間語法', () => {
    const base = new Date('2026-01-16T10:00:00Z');
    const next = Utils.getNextOccurrence('every 30m', base);

    expect(next).toBeInstanceOf(Date);
    expect(next.getTime()).toBe(base.getTime() + 30 * 60 * 1000);
  });

  test('getNextOccurrence 應支援簡寫相對時間語法', () => {
    const base = new Date('2026-01-16T10:00:00Z');
    const next = Utils.getNextOccurrence('2h', base);

    expect(next).toBeInstanceOf(Date);
    expect(next.getTime()).toBe(base.getTime() + 2 * 60 * 60 * 1000);
  });

  test('getNextOccurrence 對既有 cron 表達式仍可運作', () => {
    const next = Utils.getNextOccurrence('0 9 * * *', new Date('2026-01-16T10:00:00Z'));
    expect(next).toBeInstanceOf(Date);
  });

  test('getNextOccurrence 遇到無效表達式應回傳 null', () => {
    const next = Utils.getNextOccurrence('not-a-valid-expr', new Date('2026-01-16T10:00:00Z'));
    expect(next).toBeNull();
  });

  test('getNextOccurrence 應支援月份欄 rN（以 baseDate 月份為錨點）', () => {
    const base = new Date('2026-05-02T10:00:00Z');
    const next = Utils.getNextOccurrence('0 9 1 r3 *', base);

    expect(next).toBeInstanceOf(Date);
    expect(next.getMonth() + 1).toBe(8); // 5,8,11 中，下一個可執行月
    expect(next.getDate()).toBe(1);
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(0);
  });

  test('getNextOccurrence 應支援日期欄 rN（以 baseDate 日期為錨點）', () => {
    const base = new Date('2026-05-03T10:00:00Z');
    const next = Utils.getNextOccurrence('0 9 r3 * *', base);

    expect(next).toBeInstanceOf(Date);
    expect(next.getDate()).toBe(6); // 3,6,9,...
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(0);
  });

  test('getNextOccurrence 應支援分鐘欄 rN（以 baseDate 分鐘為錨點）', () => {
    const base = new Date('2026-05-04T10:08:00Z');
    const next = Utils.getNextOccurrence('r15 * * * *', base);

    expect(next).toBeInstanceOf(Date);
    expect(next.getMinutes()).toBe(23); // 8,23,38,53 中，下一個 > base 為 23
  });

});
