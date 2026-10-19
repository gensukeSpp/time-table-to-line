import { useState } from 'react';
import { Box, Button, Drawer, Loader, Text, UnstyledButton } from '@mantine/core';
import { format } from 'date-fns';

import { MilestoneProps, MilestoneEventProps } from '../../lib/TimelineType';
import { filterCompletedEvents } from '../../lib/milestoneEvents';
import { formatAccomplishedDate } from '../../lib/milestone';
import { useClosedMilestonesQuery, useClosedMilestoneEventsQuery } from '../../resources/queries';
import { clampLine, clamp1, clamp2 } from '../molecules/clampText.css';
import { row, colorBar, accomplishedDate, nestedList, eventRow, metaLine } from './ClosedMilestoneDrawer.css';

// 段 3: イベントを開いたときに出す 3 データ (staff_id / グループ名 / end_time)
const ClosedEventItem = ({ event }: { event: MilestoneEventProps }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box className={eventRow}>
      <UnstyledButton
        className={`${clampLine} ${expanded ? clamp2 : clamp1}`}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {event.title}
      </UnstyledButton>
      {expanded && (
        <>
          <Text className={metaLine}>スタッフID: {event.staff_id}</Text>
          <Text className={metaLine}>グループ名: {event.group_name ?? '不明'}</Text>
          <Text className={metaLine}>終了日時: {format(new Date(event.end), 'yyyy/MM/dd HH:mm')}</Text>
        </>
      )}
    </Box>
  );
};

// 段 2: 「完了」イベントのみのアコーディオンリスト
const ClosedMilestoneEvents = ({ milestoneId }: { milestoneId: number }) => {
  const { data, isPending, isError, error } = useClosedMilestoneEventsQuery(milestoneId, true);
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
      {opened && <ClosedMilestoneEvents milestoneId={milestone.id} />}
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
