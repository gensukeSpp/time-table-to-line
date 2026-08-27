import { useState } from 'react';
import { Modal, TextInput, Textarea, Button } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { format } from 'date-fns';

import { useAddMilestoneMutation, MilestoneFormValues } from '../../hooks/useMilestoneMutation';
import { form, actions } from './MilestoneCreateDialog.css';

interface MilestoneCreateDialogProps {
  opened: boolean;
  onClose: () => void;
}

export const MilestoneCreateDialog = ({
  opened,
  onClose
}: MilestoneCreateDialogProps) => {
  const addMilestone = useAddMilestoneMutation();

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [guidlineEndDate, setGuidlineEndDate] = useState<Date | null>(null);

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    const values: MilestoneFormValues = {
      title: title.trim(),
      description: description.trim() || undefined,
      guidline_end_date: guidlineEndDate
        ? format(guidlineEndDate, 'yyyy-MM-dd')
        : undefined
    };

    addMilestone.mutate(values, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="マイルストーンを追加"
      centered
    >
      <form
        className={form}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <TextInput
          label="タイトル"
          placeholder="マイルストーンのタイトルを入力"
          required
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />
        <Textarea
          label="説明"
          placeholder="マイルストーンの説明を入力"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />
        <DateInput
          label="ガイドライン終了日"
          placeholder="日付を選択"
          value={guidlineEndDate}
          onChange={setGuidlineEndDate}
          clearable
        />
        <div className={actions}>
          <Button variant="default" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" disabled={!title.trim()} loading={addMilestone.isPending}>
            追加
          </Button>
        </div>
      </form>
    </Modal>
  );
};
