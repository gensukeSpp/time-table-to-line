import { Box, Text, Loader } from '@mantine/core';

import { useMilestonesQuery } from '../../resources/queries';
import { list, item, colorBar } from './MilestoneList.css';

export const MilestoneList = () => {
  const { data, isPending } = useMilestonesQuery();

  if (isPending) {
    return (
      <Box>
        <Loader size="sm" />
      </Box>
    );
  }

  const openMilestones = (data ?? []).filter((milestone) => milestone.status);

  return (
    <Box className={list}>
      {openMilestones.map((milestone) => (
        <Box key={milestone.id} className={item}>
          <Box
            className={colorBar}
            style={{ backgroundColor: milestone.color }}
          />
          <Text>{milestone.title}</Text>
        </Box>
      ))}
    </Box>
  );
};
