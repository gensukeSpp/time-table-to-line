export type InquiryStaff = {
  staff_id: number;
  group_id: number;
  group_name: string;
};

/**
 * /timetable/inquiry のレスポンスを staff_id 付きペイロードに正規化する。
 * 文字列 JSON・ネスト・authId 別名にも対応する。
 */
export function normalizeAuthPayload(raw: unknown): InquiryStaff | null {
  let value: unknown = raw;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const obj = value as Record<string, unknown>;
  const inner =
    obj.data && typeof obj.data === 'object'
      ? (obj.data as Record<string, unknown>)
      : obj;

  const staffRaw = inner.staff_id ?? inner.authId;
  if (staffRaw == null || staffRaw === '') {
    return null;
  }

  const staff_id = Number(staffRaw);
  if (Number.isNaN(staff_id)) {
    return null;
  }

  return {
    staff_id,
    group_id: Number(inner.group_id ?? inner.code ?? 0),
    group_name: String(inner.group_name ?? inner.group ?? ''),
  };
}
