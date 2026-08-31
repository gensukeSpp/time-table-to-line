import { useState } from 'react';
import { Box, Text, Loader, Button } from '@mantine/core';

import { useMilestonesQuery } from '../../resources/queries';
import { MilestoneProps } from '../../lib/TimelineType';
import { useAuthInfo } from '../../hooks/useAuthGuard';
import { MilestoneListTitle } from './MilestoneListTitle';
import { MilestoneDetailDialog } from './MilestoneDetailDialog';
import { list } from './MilestoneList.css';

export const MilestoneList = () => {
  const { data, isPending, isError, error } = useMilestonesQuery();
  const authInfo = useAuthInfo();
  const isAdmin = authInfo.type === 'auth' ? authInfo.admin : false;
  const [selected, setSelected] = useState<MilestoneProps | null>(null);

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

  const openMilestones = (data ?? []).filter((m) => m.status !== 'closed');
  const handleOpenDetail = isAdmin ? setSelected : () => undefined;

  return (
    <>
      <Box className={list}>
        {openMilestones.map((milestone) => (
          <MilestoneListTitle
            key={milestone.id}
            milestone={milestone}
            admin={isAdmin}
            onOpenDetail={handleOpenDetail}
          />
        ))}
      </Box>
      {selected && isAdmin && (
        <MilestoneDetailDialog
          milestone={selected}
          admin={isAdmin}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};