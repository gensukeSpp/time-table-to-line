import { useState } from 'react';
import { Button } from '@mantine/core';

import { ClosedMilestoneDrawer } from './ClosedMilestoneDrawer';

interface MilestoneClosedButtonProps {
  admin: boolean;
}

// Issue #41: closed マイルストーンの参照は管理者のみ。
export const MilestoneClosedButton = ({ admin }: MilestoneClosedButtonProps) => {
  const [opened, setOpened] = useState(false);

  if (!admin) {
    return null;
  }

  return (
    <>
      <Button variant="default" onClick={() => setOpened(true)}>
        閉じたマイルストーン
      </Button>
      {opened && <ClosedMilestoneDrawer onClose={() => setOpened(false)} />}
    </>
  );
};
