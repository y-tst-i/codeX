/**
 * Gemini TTSの「今日使った回数」を数える。
 * Googleの1日の上限は米国太平洋時間の0時（日本時間の16〜17時ごろ）にリセットされるので、
 * その日付ごとに数える。
 */

const KEY = "tms.ttsUsage.v1";

export function quotaDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

interface UsageRecord {
  day: string;
  count: number;
}

function read(): UsageRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UsageRecord) : null;
  } catch {
    return null;
  }
}

export function todayTtsCalls(now = new Date()): number {
  const record = read();
  return record && record.day === quotaDay(now) ? record.count : 0;
}

export function recordTtsCall(now = new Date()): void {
  try {
    const day = quotaDay(now);
    const record = read();
    const count = record && record.day === day ? record.count + 1 : 1;
    localStorage.setItem(KEY, JSON.stringify({ day, count }));
    window.dispatchEvent(new Event("tms-tts-usage"));
  } catch {
    // テスト環境など、保存できなくても生成は続ける
  }
}
