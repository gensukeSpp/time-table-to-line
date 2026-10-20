import { MilestoneEventProps, ProgressGroupKey } from './TimelineType';

const TOKEN_TO_GROUP: Readonly<Record<string, ProgressGroupKey>> = {
  これから: 'これから', まだ: 'まだ', もうすぐ: 'もうすぐ', 完了: '完了',
  'from now': 'これから', still: 'まだ', almost: 'もうすぐ', complete: '完了',
};

export const PROGRESS_GROUP_ORDER: Readonly<ProgressGroupKey[]> =
  ['これから', 'まだ', 'もうすぐ', '完了', '指定なし'];

export function normalizeProgressGroup(progress?: string | null): ProgressGroupKey {
  if (!progress) return '指定なし';
  return Object.prototype.hasOwnProperty.call(TOKEN_TO_GROUP, progress) ? TOKEN_TO_GROUP[progress] : '指定なし';
}

export interface ProgressGroup {
  key: ProgressGroupKey;
  events: MilestoneEventProps[];
}

export function groupMilestoneEventsByProgress(events: MilestoneEventProps[]): ProgressGroup[] {
  return PROGRESS_GROUP_ORDER
    .map((key) => ({ key, events: (events ?? []).filter((e) => normalizeProgressGroup(e.progress) === key) }))
    .filter((g) => g.events.length > 0);
}

// Issue #41: 閉じたマイルストーンでは「完了」イベントのみを表示する。
// progress の正規化 (英字トークン / null) は normalizeProgressGroup に一本化する。
export function filterCompletedEvents(events: MilestoneEventProps[]): MilestoneEventProps[] {
  return (events ?? []).filter((e) => normalizeProgressGroup(e.progress) === '完了');
}
