import { addDays, format } from 'date-fns';

// TODO(issue): 猶予期間の実値が決まったら置き換える（現在は仮の 2 日）
export const MILESTONE_CLOSE_GRACE_DAYS = 2;

export function getMilestoneClosedAt(accomplished_date?: string | null): Date | null {
  if (!accomplished_date) return null;
  return addDays(new Date(accomplished_date), MILESTONE_CLOSE_GRACE_DAYS);
}

export function formatClosedLabel(accomplished_date?: string | null): string | null {
  const d = getMilestoneClosedAt(accomplished_date);
  return d ? format(d, 'MM/dd') : null;
}