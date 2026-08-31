import { Box, Text, UnstyledButton } from '@mantine/core';

import { MilestoneProps } from '../../lib/TimelineType';
import { formatClosedLabel } from '../../lib/milestone';
import { item, colorBar, waitingDate, titleButton } from './MilestoneList.css';

interface MilestoneListTitleProps {
  milestone: MilestoneProps;
  admin: boolean;
  onOpenDetail: (milestone: MilestoneProps) => void;
}

export const MilestoneListTitle = ({ milestone, admin, onOpenDetail }: MilestoneListTitleProps) => {
  const closedLabel = milestone.status === 'waiting'
    ? formatClosedLabel(milestone.accomplished_date)
    : null;

  const handleOpen = () => {
    if (!admin) return;
    onOpenDetail(milestone);
  };

  return (
    <Box className={item}>
      <Box className={colorBar} style={{ backgroundColor: milestone.color }} />
      {closedLabel && <Text className={waitingDate}>{closedLabel} close</Text>}
      <UnstyledButton
        className={titleButton}
        onClick={handleOpen}
        disabled={!admin}
        aria-disabled={!admin}
        style={{ cursor: admin ? 'pointer' : 'not-allowed', opacity: admin ? 1 : 0.7 }}
      >
        <Text>{milestone.title}</Text>
      </UnstyledButton>
    </Box>
  );
};