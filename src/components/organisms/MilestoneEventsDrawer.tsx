import { useState } from 'react';
import { Box, Drawer, Accordion, Collapse, Text, Loader, Button, UnstyledButton, ActionIcon } from '@mantine/core';
import { format } from 'date-fns';

import { MilestoneProps, MilestoneEventProps } from '../../lib/TimelineType';
import { groupMilestoneEventsByProgress } from '../../lib/milestoneEvents';
import { useMilestoneEventsQuery } from '../../resources/queries';
import {
  header,
  colorBar,
  eventRow,
  eventTitleRow,
  metaLine,
  toggleIcon,
} from './MilestoneEventsDrawer.css';
import { clampLine, clamp1, clamp2 } from '../molecules/clampText.css';

interface MilestoneEventsDrawerProps {
  milestone: MilestoneProps;
  onClose: () => void;
}

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

const MilestoneEventRow = ({ event }: { event: MilestoneEventProps }) => {
  const [expanded, setExpanded] = useState(false);
  const handleClick = () => setExpanded((v) => !v);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpanded((v) => !v);
    }
  };
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
          aria-controls={`milestone-event-${event.id}-meta`}
          data-expanded={expanded}
          onClick={handleClick}
        >
          <ChevronIcon />
        </ActionIcon>
        <UnstyledButton
          className={`${clampLine} ${expanded ? clamp2 : clamp1}`}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-expanded={expanded}
          aria-controls={`milestone-event-${event.id}-meta`}
        >
          {event.title}
        </UnstyledButton>
      </Box>
      <Collapse in={expanded} id={`milestone-event-${event.id}-meta`}>
        <Text className={metaLine}>スタッフID: {event.staff_id}</Text>
        <Text className={metaLine}>グループ名: {event.group_name ?? '不明'}</Text>
        <Text className={metaLine}>開始日時: {format(new Date(event.start), 'yyyy/MM/dd HH:mm')}</Text>
      </Collapse>
    </Box>
  );
};

export const MilestoneEventsDrawer = ({ milestone, onClose }: MilestoneEventsDrawerProps) => {
  const { data, isPending, isError, error } = useMilestoneEventsQuery(milestone.id, true);
  const groups = groupMilestoneEventsByProgress(data ?? []);

  return (
    <Drawer
      opened
      position="right"
      onClose={onClose}
      size="md"
      title={
        <Box className={header}>
          <Box className={colorBar} style={{ backgroundColor: milestone.color }} />
          <Text>{milestone.title}</Text>
        </Box>
      }
    >
      {isPending ? (
        <Loader size="sm" />
      ) : isError ? (
        <Box>
          <Text>{error?.message || 'イベントの取得に失敗しました'}</Text>
          <Button onClick={onClose}>閉じる</Button>
        </Box>
      ) : groups.length === 0 ? (
        <Text c="dimmed">所属イベントはありません</Text>
      ) : (
        <Accordion>
          {groups.map((g) => (
            <Accordion.Item key={g.key} value={g.key}>
              <Accordion.Control>{g.key}（{g.events.length}）</Accordion.Control>
              <Accordion.Panel>
                {g.events.map((ev) => <MilestoneEventRow key={ev.id} event={ev} />)}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Drawer>
  );
};
