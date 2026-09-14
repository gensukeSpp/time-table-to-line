// マイルストーン一覧の自動再取得間隔（ms）。既定 60 分
const DEFAULT_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
// マイルストーン自動 close の猶予日数（accomplished_date から何日後に closed 化するか）。既定 5 日（2026-09-08 正式採用）
const DEFAULT_CLOSE_GRACE_DAYS = 5;

/**
 * 環境変数の数値を安全にパースする。
 * - 未設定 or 空文字 → fallback（未設定扱い）
 * - 非数値 / 0 以下 / 非整数 → fallback
 * - それ以外 → 正整数として返す
 */
export function parseEnvPositiveInt(
  raw: string | undefined,
  fallback: number
): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export const MILESTONE_REFRESH_INTERVAL_MS = parseEnvPositiveInt(
  import.meta.env.VITE_MILESTONE_REFRESH_INTERVAL_MS,
  DEFAULT_REFRESH_INTERVAL_MS
);

export const MILESTONE_CLOSE_GRACE_DAYS = parseEnvPositiveInt(
  import.meta.env.VITE_MILESTONE_CLOSE_GRACE_DAYS,
  DEFAULT_CLOSE_GRACE_DAYS
);
