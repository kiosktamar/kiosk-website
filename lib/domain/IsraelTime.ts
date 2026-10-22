// lib/domain/IsraelTime.ts — time formatting and calculation in Asia/Jerusalem timezone.
// Isomorphic: runs in browser and server.

import { CLOSE_TIME_MAX_HOURS, CLOSE_TIME_MIN_MINUTES, TIMEZONE } from '@/lib/contracts/limits';

export class IsraelTime {
  private static toDate(value: Date | string): Date {
    return typeof value === 'string' ? new Date(value) : value;
  }

  private static getParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    return {
      year: parseInt(get('year'), 10),
      month: parseInt(get('month'), 10),
      day: parseInt(get('day'), 10),
      hour: parseInt(get('hour'), 10),
      minute: parseInt(get('minute'), 10),
      yearStr: get('year'),
      monthStr: get('month'),
      dayStr: get('day'),
      hourStr: get('hour'),
      minuteStr: get('minute'),
    };
  }

  static formatTime(value: Date | string): string {
    const d = IsraelTime.toDate(value);
    const p = IsraelTime.getParts(d);
    return `${p.hourStr}:${p.minuteStr}`;
  }

  static formatDate(value: Date | string): string {
    const d = IsraelTime.toDate(value);
    const p = IsraelTime.getParts(d);
    return `${p.dayStr}/${p.monthStr}`;
  }

  static formatFullDate(value: Date | string): string {
    const d = IsraelTime.toDate(value);
    const p = IsraelTime.getParts(d);
    return `${p.dayStr}/${p.monthStr}/${p.yearStr}`;
  }

  static dateKey(value: Date | string): string {
    const d = IsraelTime.toDate(value);
    const p = IsraelTime.getParts(d);
    return `${p.yearStr}-${p.monthStr}-${p.dayStr}`;
  }

  static wallTimeToUtc(hhmm: string, now: Date): Date {
    const [targetH, targetM] = hhmm.split(':').map((s) => parseInt(s, 10));
    if (isNaN(targetH) || isNaN(targetM) || targetH < 0 || targetH > 23 || targetM < 0 || targetM > 59) {
      throw new RangeError(`Invalid wall time format: ${hhmm}`);
    }

    const todayParts = IsraelTime.getParts(now);

    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      // Anchor to noon UTC to safely step across days
      const refUtc = Date.UTC(
        todayParts.year,
        todayParts.month - 1,
        todayParts.day + dayOffset,
        12,
        0,
        0,
      );
      const dayParts = IsraelTime.getParts(new Date(refUtc));

      // Israel timezone offset is either UTC+2 or UTC+3
      const candidates = [
        new Date(
          Date.UTC(dayParts.year, dayParts.month - 1, dayParts.day, targetH - 2, targetM, 0, 0),
        ),
        new Date(
          Date.UTC(dayParts.year, dayParts.month - 1, dayParts.day, targetH - 3, targetM, 0, 0),
        ),
      ];

      for (const cand of candidates) {
        if (IsraelTime.formatTime(cand) === hhmm) {
          if (cand.getTime() > now.getTime()) {
            return cand;
          }
        }
      }
    }

    throw new Error(`Could not resolve wall time '${hhmm}' strictly after ${now.toISOString()}`);
  }

  static isValidClosingTime(closesAt: Date, now: Date): boolean {
    const minMs = now.getTime() + CLOSE_TIME_MIN_MINUTES * 60 * 1000;
    const maxMs = now.getTime() + CLOSE_TIME_MAX_HOURS * 60 * 60 * 1000;
    const closesAtMs = closesAt.getTime();
    return closesAtMs >= minMs && closesAtMs <= maxMs;
  }

  static minutesBetween(from: Date | string, to: Date): number {
    const fromDate = IsraelTime.toDate(from);
    const diffMs = to.getTime() - fromDate.getTime();
    return Math.max(0, Math.floor(diffMs / (60 * 1000)));
  }
}
