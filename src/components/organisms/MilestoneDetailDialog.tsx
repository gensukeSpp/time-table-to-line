import { useState, useEffect } from 'react';
import { Modal, TextInput, Textarea, Button, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { format, parseISO } from 'date-fns';

import { MilestoneProps } from '../../lib/TimelineType';
import { useUpdateMilestoneMutation, MilestoneUpdateFormValues } from '../../hooks/useMilestoneMutation';
import { useGroupUsersQuery } from '../../resources/queries';
import { useAuthInfo } from '../../hooks/useAuthGuard';
import { form, actions } from './MilestoneDetailDialog.css';

interface MilestoneDetailDialogProps {
  milestone: MilestoneProps | null;   // null なら閉じている
  onClose: () => void;
}

export const MilestoneDetailDialog = ({ milestone, onClose }: MilestoneDetailDialogProps) => {
  const { data: groupUsers } = useGroupUsersQuery();
  const authInfo = useAuthInfo();
  const updateMilestone = useUpdateMilestoneMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [guidelineEndDate, setGuidelineEndDate] = useState<Date | null>(null);
  const [accomplishedDate, setAccomplishedDate] = useState<Date | null>(null);

  // milestone が変わったらフォームを初期化
  useEffect(() => {
    if (!milestone) return;
    setTitle(milestone.title ?? '');
    setDescription(milestone.description ?? '');
    setGuidelineEndDate(milestone.guideline_end_date ? parseISO(milestone.guideline_end_date) : null);
    setAccomplishedDate(milestone.accomplished_date ? parseISO(milestone.accomplished_date) : null);
  }, [milestone]);

  const creator = groupUsers?.data?.find((u) => u.staff_id === milestone?.staff_id);
  const creatorName = creator ? `${creator.family_kana ?? ''}${creator.last_kana ?? ''}` : '不明';
  const groupName = authInfo.type === 'auth' ? authInfo.group : 'グループなし';

  const handleUpdate = () => {
    if (!milestone || !title.trim()) return;
    const body: MilestoneUpdateFormValues = {
      title: title.trim(),
      description: description.trim() || undefined,
      guideline_end_date: guidelineEndDate ? format(guidelineEndDate, 'yyyy-MM-dd') : null,
      accomplished_date: accomplishedDate ? format(accomplishedDate, 'yyyy-MM-dd') : null,
    };
    updateMilestone.mutate({ id: milestone.id, body }, { onSuccess: onClose });
  };

  return (
    <Modal opened={!!milestone} onClose={onClose} title="マイルストーン詳細" centered>
      {milestone && (
        <form className={form}
          onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
          <Text>作成者名: {creatorName}</Text>
          <Text>グループ名: {groupName}</Text>
          <TextInput label="タイトル" required value={title}
            onChange={(e) => setTitle(e.currentTarget.value)} />
          <Textarea label="説明" value={description}
            onChange={(e) => setDescription(e.currentTarget.value)} />
          <DateInput label="ガイドライン終了日" value={guidelineEndDate}
            onChange={setGuidelineEndDate} clearable />
          <DateInput label="達成日" placeholder="達成日(空)" value={accomplishedDate}
            onChange={setAccomplishedDate} clearable />
          <div className={actions}>
            <Button variant="default" onClick={onClose}>キャンセル</Button>
            <Button type="submit" disabled={!title.trim()} loading={updateMilestone.isPending}>更新</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};