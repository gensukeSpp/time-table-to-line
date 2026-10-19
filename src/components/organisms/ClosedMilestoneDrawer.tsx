import { useState } from 'react';
import { ActionIcon, Box, Button, Collapse, Drawer, Loader, Text, UnstyledButton } from '@mantine/core';
import { format } from 'date-fns';

import { MilestoneProps, MilestoneEventProps } from '../../lib/TimelineType';
import { filterCompletedEvents } from '../../lib/milestoneEvents';
import { formatAccomplishedDate } from '../../lib/milestone';
import { useClosedMilestonesQuery, useClosedMilestoneEventsQuery } from '../../resources/queries';
import { clampLine, clamp1, clamp2 } from '../molecules/clampText.css';
import {
  row,
  colorBar,
  accomplishedDate,
  nestedList,
  eventRow,
  eventTitleRow,
  toggleIcon,
  metaLine,
} from './ClosedMilestoneDrawer.css';

// 開閉状態を示す chevron（開くと 90 度回転）
const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path
      d="M6 3l5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 段 3: イベントを開いたときに出す 3 データ (staff_id / グループ名 / end_time)
const ClosedEventItem = ({ event }: { event: MilestoneEventProps }) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);

  return (
    <Box className={eventRow}>
      <Box className={eventTitleRow}>
        <ActionIcon
          className={toggleIcon}
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={`${event.title} の詳細を開閉`}
          aria-expanded={expanded}
          data-expanded={expanded}
          onClick={toggle}
        >
          <ChevronIcon />
        </ActionIcon>
        <UnstyledButton
          className={`${clampLine} ${expanded ? clamp2 : clamp1}`}
          aria-expanded={expanded}
          onClick={toggle}
        >
          {event.title}
        </UnstyledButton>
      </Box>
      {/* Issue #40 の Accordion と同等の開閉アニメーション (Mantine Collapse: 200ms ease) */}
      <Collapse in={expanded}>
        <Text className={metaLine}>スタッフID: {event.staff_id}</Text>
        <Text className={metaLine}>グループ名: {event.group_name ?? '不明'}</Text>
        <Text className={metaLine}>終了日時: {format(new Date(event.end), 'yyyy/MM/dd HH:mm')}</Text>
      </Collapse>
    </Box>
  );
};

// 段 2: 「完了」イベントのみのアコーディオンリスト
// enabled は Collapse の開閉状態をそのまま渡し、開いたときだけ取得する。
const ClosedMilestoneEvents = ({ milestoneId, enabled }: { milestoneId: number; enabled: boolean }) => {
  const { data, isPending, isError, error } = useClosedMilestoneEventsQuery(milestoneId, enabled);
  const completed = filterCompletedEvents(data ?? []);

  if (isPending) {
    return <Loader size="xs" />;
  }

  if (isError) {
    return <Text c="red">{error?.message || 'イベントの取得に失敗しました'}</Text>;
  }

  if (completed.length === 0) {
    return <Text c="dimmed" className={metaLine}>完了イベントはありません</Text>;
  }

  return (
    <Box className={nestedList}>
      {completed.map((event) => (
        <ClosedEventItem key={event.id} event={event} />
      ))}
    </Box>
  );
};

// 段 1: マイルストーン行 (タイトル + 達成日)。クリックで段 2 を開閉し、タイトルは 2 行表示になる。
const ClosedMilestoneRow = ({ milestone }: { milestone: MilestoneProps }) => {
  const [opened, setOpened] = useState(false);

  return (
    <Box className={eventRow}>
      <Box className={row}>
        <Box className={colorBar} style={{ backgroundColor: milestone.color }} />
        <UnstyledButton
          className={`${clampLine} ${opened ? clamp2 : clamp1}`}
          aria-label={`${milestone.title} の完了イベント`}
          aria-expanded={opened}
          onClick={() => setOpened((v) => !v)}
        >
          {milestone.title}
        </UnstyledButton>
        <Text className={accomplishedDate}>{formatAccomplishedDate(milestone.accomplished_date)}</Text>
      </Box>
      {/* 開閉アニメーション: Collapse は閉時も子を保持するため、閉じるときも滑らかに畳める */}
      <Collapse in={opened}>
        <ClosedMilestoneEvents milestoneId={milestone.id} enabled={opened} />
      </Collapse>
    </Box>
  );
};

interface ClosedMilestoneDrawerProps {
  onClose: () => void;
}

export const ClosedMilestoneDrawer = ({ onClose }: ClosedMilestoneDrawerProps) => {
  const { data, isPending, isError, error } = useClosedMilestonesQuery(true);
  const milestones = data ?? [];

  return (
    <Drawer opened position="right" onClose={onClose} size="md" title="閉じたマイルストーン">
      {isPending ? (
        <Loader size="sm" />
      ) : isError ? (
        <Box>
          <Text>{error?.message || '閉じたマイルストーンの取得に失敗しました'}</Text>
          <Button onClick={onClose}>閉じる</Button>
        </Box>
      ) : milestones.length === 0 ? (
        <Text c="dimmed">閉じたマイルストーンはありません</Text>
      ) : (
        <Box>
          {milestones.map((milestone) => (
            <ClosedMilestoneRow key={milestone.id} milestone={milestone} />
          ))}
        </Box>
      )}
    </Drawer>
  );
};
