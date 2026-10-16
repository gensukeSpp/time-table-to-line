import { Box, Text, UnstyledButton, ActionIcon } from '@mantine/core';

import { MilestoneProps } from '../../lib/TimelineType';
import { formatClosedLabel } from '../../lib/milestone';
import { item, colorBar, waitingDate, titleButton, moreButton } from './MilestoneList.css';

interface MilestoneListTitleProps {
  milestone: MilestoneProps;
  onOpenDetail: (milestone: MilestoneProps) => void;
  onOpenEvents: (milestone: MilestoneProps) => void;
}

export const MilestoneListTitle = ({ milestone, onOpenDetail, onOpenEvents }: MilestoneListTitleProps) => {
  const closedLabel = milestone.status === 'waiting'
    ? formatClosedLabel(milestone.accomplished_date)
    : null;

  return (
    <Box className={item}>
      <Box className={colorBar} style={{ backgroundColor: milestone.color }} />
      {closedLabel && <Text className={waitingDate}>{closedLabel} close</Text>}
      <UnstyledButton className={titleButton} onClick={() => onOpenDetail(milestone)}>
        <Text>{milestone.title}</Text>
      </UnstyledButton>
      <ActionIcon
        className={moreButton}
        variant="subtle"
        aria-label={`${milestone.title} のイベント`}
        onClick={() => onOpenEvents(milestone)}
      >
        ...
      </ActionIcon>
    </Box>
  );
};
