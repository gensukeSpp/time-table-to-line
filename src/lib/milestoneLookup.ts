import { MilestoneProps, MilestoneStatus } from './TimelineType';

export function buildMilestoneColorMap(milestones: MilestoneProps[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const m of milestones) map.set(m.id, m.color);
  return map;
}

export function buildMilestoneStatusMap(milestones: MilestoneProps[]): Map<number, MilestoneStatus> {
  const map = new Map<number, MilestoneStatus>();
  for (const m of milestones) map.set(m.id, m.status);
  return map;
}

// イベントの milestone_id から、適用する装飾（色 / 網掛け）を返す。
// milestone_id が undefined / null（未所属）なら {} を返し、デフォルト色 #2196f3 のままにする。
export function computeItemDecorations(
  colorMap: Map<number, string>,
  statusMap: Map<number, MilestoneStatus>,
  milestoneId?: number | null
): { backgroundColor?: string; opacity?: number } {
  if (milestoneId == null) return {};
  const out: { backgroundColor?: string; opacity?: number } = {};
  const color = colorMap.get(milestoneId);
  if (color) out.backgroundColor = color;
  if (statusMap.get(milestoneId) === 'waiting') out.opacity = 0.7;
  return out;
}