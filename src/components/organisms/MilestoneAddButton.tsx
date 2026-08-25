import { useState } from 'react';
import { Button } from '@mantine/core';

import { addButtonArea } from './MilestoneAddButton.css';
import { MilestoneCreateDialog } from './MilestoneCreateDialog';

interface MilestoneAddButtonProps {
  admin: boolean;
}

export const MilestoneAddButton = ({ admin }: MilestoneAddButtonProps) => {
  const [opened, setOpened] = useState(false);

  if (!admin) {
    return null;
  }

  return (
    <>
      <div className={addButtonArea}>
        <Button onClick={() => setOpened(true)}>マイルストーン作成</Button>
      </div>
      <MilestoneCreateDialog opened={opened} onClose={() => setOpened(false)} />
    </>
  );
};
