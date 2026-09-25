import { isSameDay } from 'date-fns';
import type { View } from 'react-big-calendar';

import { isFullDayEvent } from './slot';

// ---- 配色定数 ----
// 進捗なし（null / 初期）のデフォルト色 = rbc 既定色。
export const DEFAULT_EVENT_COLOR = '#3174ad';
// Issue #30: 'month' ビューのフルデイ識別色（teal）。
export const MONTH_FULLDAY_COLOR = '#00695c';

// 進捗 → 色（キーは日本語ラベル。未知値はデフォルトへ）。
// 候補パレット: 青の強い紫 → 赤の強い紫 の 4 段階。
// マイルストーン10色 / #3174ad / #00695c と紛らわしくない濃色（600 系）。
// ※ 最終色はユーザー確認で調整する（overview リスク1 / test-plan §1）。
export const PROGRESS_COLORS: Readonly<Record<string, string>> = {
  これから: '#3949ab',
  まだ: '#5e35b1',
  もうすぐ: '#8e24aa',
  完了: '#d81b60',
};

// 英字トークン → ラベル（InputItem options.value / 旧データ / テストフィクスチャ互換）。
const PROGRESS_TOKEN_TO_LABEL: Readonly<Record<string, string>> = {
  'from now': 'これから',
  still: 'まだ',
  almost: 'もうすぐ',
  complete: '完了',
};

/**
 * 進捗値（ラベル or 英字トークン）を色へ変換する。
 * null / undefined / 空 / 未知値はデフォルト色へフォールバックする（エラーを出さない）。
 */
export function progressToColor(progress?: string | null): string {
  if (!progress) return DEFAULT_EVENT_COLOR;
  const key = PROGRESS_TOKEN_TO_LABEL[progress] ?? progress;
  return PROGRESS_COLORS[key] ?? DEFAULT_EVENT_COLOR;
}

/**
 * 'month' ビューの「全デイ扱い」= 同一日フルデイ または 日跨ぎ（rbc の showAsAllDay 相当）。
 * 日跨ぎイベントを #00695c のまま残すことで、Issue #30 の描画を回帰ゼロで再現する。
 */
export function isMonthAllday(start: Date, end: Date): boolean {
  return isFullDayEvent(start, end) || !isSameDay(start, end);
}

/**
 * ビューに応じてイベントの配色を決める（Issue #37: week 以外の day / agenda / work_week にも進捗色を正式適用）。
 * - 'month' : 進捗配色は適用しない。フルデイ系のみ MONTH_FULLDAY_COLOR、他は undefined（default）。
 * - 'week' / 'day' / 'agenda' / 'work_week' : 進捗色。null は undefined を返し rbc 既定（#3174ad）へ委譲する。
 */
export function resolveEventColor(
  event: { progress?: string | null; start_time: Date; end_time: Date },
  view: View
): string | undefined {
  if (view === 'month') {
    return isMonthAllday(event.start_time, event.end_time)
      ? MONTH_FULLDAY_COLOR
      : undefined;
  }
  const color = progressToColor(event.progress);
  return color === DEFAULT_EVENT_COLOR ? undefined : color;
}