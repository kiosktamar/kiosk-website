import { describe, it, expect } from 'vitest';
import { IsraelTime } from './IsraelTime';

describe('IsraelTime', () => {
  it('formats time in winter (UTC+2) and summer (UTC+3)', () => {
    // 2026-01-15 12:00 UTC -> winter -> 14:00 Israel
    const winterUtc = new Date('2026-01-15T12:00:00Z');
    expect(IsraelTime.formatTime(winterUtc)).toBe('14:00');

    // 2026-07-15 12:00 UTC -> summer -> 15:00 Israel
    const summerUtc = new Date('2026-07-15T12:00:00Z');
    expect(IsraelTime.formatTime(summerUtc)).toBe('15:00');
  });

  it('formats full date and dateKey accurately around midnight', () => {
    // 2026-05-10 21:30 UTC -> in Israel (+3) it is 2026-05-11 00:30
    const nearMidnight = new Date('2026-05-10T21:30:00Z');
    expect(IsraelTime.formatTime(nearMidnight)).toBe('00:30');
    expect(IsraelTime.formatDate(nearMidnight)).toBe('11/05');
    expect(IsraelTime.formatFullDate(nearMidnight)).toBe('11/05/2026');
    expect(IsraelTime.dateKey(nearMidnight)).toBe('2026-05-11');
  });

  it('calculates wallTimeToUtc for today and tomorrow', () => {
    // Winter: now is 10:00 Israel time (08:00 UTC) on 2026-01-15
    const nowWinterMorning = new Date('2026-01-15T08:00:00Z');
    // Target: 14:00 today
    const utcToday = IsraelTime.wallTimeToUtc('14:00', nowWinterMorning);
    expect(utcToday.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    expect(IsraelTime.formatTime(utcToday)).toBe('14:00');

    // Now is 16:00 Israel time (14:00 UTC) on 2026-01-15
    const nowWinterAfternoon = new Date('2026-01-15T14:00:00Z');
    // Target 14:00 has already passed today, so should resolve to 14:00 tomorrow
    const utcTomorrow = IsraelTime.wallTimeToUtc('14:00', nowWinterAfternoon);
    expect(utcTomorrow.toISOString()).toBe('2026-01-16T12:00:00.000Z');
    expect(IsraelTime.formatTime(utcTomorrow)).toBe('14:00');
  });

  it('resolves wallTimeToUtc on DST transition day', () => {
    // Israel DST transition in 2026: Friday, March 27, 2026
    // At 02:00 clocks move forward to 03:00 (offset changes from +2 to +3)
    const nowBeforeDST = new Date('2026-03-26T20:00:00Z'); // 22:00 Israel time on March 26
    const closingTime = IsraelTime.wallTimeToUtc('13:30', nowBeforeDST);
    // On March 27 at 13:30 Israel (+3), UTC is 10:30
    expect(closingTime.toISOString()).toBe('2026-03-27T10:30:00.000Z');
    expect(IsraelTime.formatTime(closingTime)).toBe('13:30');
  });

  it('validates closing time boundaries (59s, 1min, 10h, 10h+1min)', () => {
    const now = new Date('2026-05-10T10:00:00Z');

    const t59s = new Date(now.getTime() + 59 * 1000);
    expect(IsraelTime.isValidClosingTime(t59s, now)).toBe(false);

    const t1m = new Date(now.getTime() + 60 * 1000);
    expect(IsraelTime.isValidClosingTime(t1m, now)).toBe(true);

    const t10h = new Date(now.getTime() + 10 * 3600 * 1000);
    expect(IsraelTime.isValidClosingTime(t10h, now)).toBe(true);

    const t10h1m = new Date(now.getTime() + (10 * 3600 + 60) * 1000);
    expect(IsraelTime.isValidClosingTime(t10h1m, now)).toBe(false);
  });

  it('calculates minutesBetween correctly and never returns negative', () => {
    const from = new Date('2026-05-10T10:00:00Z');
    const to = new Date('2026-05-10T10:15:45Z');
    expect(IsraelTime.minutesBetween(from, to)).toBe(15);

    // Negative difference returns 0
    expect(IsraelTime.minutesBetween(to, from)).toBe(0);
  });
});
