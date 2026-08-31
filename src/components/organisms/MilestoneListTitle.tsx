import { Box, Text, UnstyledButton } from '@mantine/core';

import { MilestoneProps } from '../../lib/TimelineType';
import { formatClosedLabel } from '../../lib/milestone';
import { item, colorBar, waitingDate, titleButton } from './MilestoneList.css';

interface MilestoneListTitleProps {
  milestone: MilestoneProps;
  onOpenDetail: (milestone: MilestoneProps) => void;
}

export const MilestoneListTitle = ({ milestone, onOpenDetail }: MilestoneListTitleProps) => {
  const closedLabel = milestone.status === 'waiting'
    ? formatClosedLabel(milestone.accomplished_date)
    : null;
  return (
    <Box className={item}>
      <Box className={colorBar} style={{ backgroundColor: milestone.color }} />
      {closedLabel && <Text className={waitingDate}>{closedLabel} close</Text>}
      {/* モーダルを開くボタンはタイトルのみ（色バーは別用途で使用予定のためクリック対象にしない） */}
      <UnstyledButton className={titleButton} onClick={() => onOpenDetail(milestone)}>
        <Text>{milestone.title}</Text>
      </UnstyledButton>
    </Box>
  );
};