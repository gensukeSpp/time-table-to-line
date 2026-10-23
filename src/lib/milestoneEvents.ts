import { MilestoneEventProps, ProgressGroupKey } from './TimelineType';
import { normalizeProgressLabel } from './progressColor';

const LABEL_TO_GROUP: Readonly<Record<string, ProgressGroupKey>> = {
  これから: 'これから', まだ: 'まだ', もうすぐ: 'もうすぐ', 完了: '完了',
};

export const PROGRESS_GROUP_ORDER: Readonly<ProgressGroupKey[]> =
  ['これから', 'まだ', 'もうすぐ', '完了', '指定なし'];

export function normalizeProgressGroup(progress?: string | null): ProgressGroupKey {
  const label = normalizeProgressLabel(progress);
  return Object.prototype.hasOwnProperty.call(LABEL_TO_GROUP, label) ? LABEL_TO_GROUP[label] : '指定なし';
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
