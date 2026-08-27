import { Box, Text, Loader, Button } from '@mantine/core';

import { useMilestonesQuery } from '../../resources/queries';
import { list, item, colorBar } from './MilestoneList.css';

export const MilestoneList = () => {
  const { data, isPending, isError, error } = useMilestonesQuery();

  if (isPending) {
    return (
      <Box>
        <Loader size="sm" />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        <Text>{error?.message || 'マイルストーンの取得に失敗しました'}</Text>
        <Button onClick={() => window.location.reload()}>再試行</Button>
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
