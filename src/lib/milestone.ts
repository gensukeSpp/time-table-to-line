import { addDays, format } from 'date-fns';
import { MILESTONE_CLOSE_GRACE_DAYS } from './env';

// 猶予日数（accomplished_date から自動 close までの日数）は .env の
// VITE_MILESTONE_CLOSE_GRACE_DAYS で設定する（既定 5 日, 2026-09-08 正式採用）。
// バックエンドの自動 close 判定（accomplished_date + 猶予日数）と実値を揃えること。

export function getMilestoneClosedAt(accomplished_date?: string | null): Date | null {
  if (!accomplished_date) return null;
  return addDays(new Date(accomplished_date), MILESTONE_CLOSE_GRACE_DAYS);
}

export function formatClosedLabel(accomplished_date?: string | null): string | null {
  const d = getMilestoneClosedAt(accomplished_date);
  return d ? format(d, 'MM/dd') : null;
}
