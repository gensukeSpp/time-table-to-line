import { useState, FormEvent, useEffect } from 'react';
import { Box, Text, TextInput, Button } from '@mantine/core';

import { useEventsState } from '../../hooks/useContextFamily';
import { useCreateMutation } from '../../hooks/useEventMutation';
import { AuthInfoProp } from '../../lib/TimelineType';
import { resolveSlotEnd } from '../../lib/slot';

interface TitleInputProps {
  authInfo: AuthInfoProp,
  slotStartTime: Date,
  closeDialog: () => void
}

export const TitleInput = ({
  authInfo, slotStartTime, closeDialog}: TitleInputProps) => {
  const eventsState = useEventsState();

  const createEvent = useCreateMutation();
  const [title, setTitle] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // 23:00 スロット等、日跨ぎになる場合は同日 endOfDay に丸めて通常イベントとして表示する
  const startTime = slotStartTime;
  const endTime = resolveSlotEnd(slotStartTime);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    if(authInfo.type === 'auth'){
      createEvent.mutate({
        id: Number(eventsState.slice(-1)[0].id) + 1,
        group: authInfo.code,
        staff_id: authInfo.authId,
        title: title,
        start_time: startTime,
        end_time: endTime
      });
    }
    closeDialog();
  }
  // なぜこれが必要となった!?
  useEffect(() => {
    setTitle('');
  }, [closeDialog]);

  return (
    <Box>
      <Text>ID {authInfo.type === 'auth' ? authInfo.authId : 'IDなし'}</Text>
      <Text>所属 {authInfo.type === 'auth' ? authInfo.group : 'グループなし'}</Text>
      <TextInput
        placeholder="やることを入力してください"
        onChange={handleChange}
        value={title}
      />
      <Button onClick={onSubmit} mt="sm">追加</Button>
    </Box>
  );
}
