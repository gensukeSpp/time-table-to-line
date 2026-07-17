import { useState, FormEvent, useEffect } from 'react';
import { ChakraProvider, Box, Text, Input, Button } from '@chakra-ui/react';
import moment from 'moment';

import { useEventsState } from '../../hooks/useContextFamily';
import { useCreateMutation } from '../../hooks/useEventMutation';
import { AuthInfoProp } from '../../lib/TimelineType';

interface TitleInputProps {
  authInfo: AuthInfoProp,
  slotStartTime: Date,
  closeDialog: () => void
}

export const TitleInput = ({
  authInfo, slotStartTime, closeDialog}: TitleInputProps) => {
// export const TitleInput = (jsonAuth: JSONValue) => {
  // const objJson = safeJsonParse(jsonAuth!.toString());
  // console.log(`In modal auth info: ${JSON.stringify(auth)}`);
  const eventsState = useEventsState();

  const createEvent = useCreateMutation();
  const [title, setTitle] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const startDT = moment(slotStartTime).format('YYYY-MM-DD HH:mm:ss');
  const endDT = moment(slotStartTime).add(1, 'hours').format('YYYY-MM-DD HH:mm:ss');
  // console.log(`end_time: ${moment(endDT)}`);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    if(authInfo.type === 'auth'){
      // createEvent.mutate(eventItem!);
      console.log(`Create mutate: ${authInfo.authId}`);
      createEvent.mutate({
        id: Number(eventsState.slice(-1)[0].id) + 1,
        group: authInfo.code,
        staff_id: authInfo.authId,
        title: title,
        start_time: moment(startDT),
        end_time: moment(endDT)
      });
    }
    closeDialog();
  }
  // なぜこれが必要となった!?
  useEffect(() => {
    setTitle('');
  }, [closeDialog]);

  return (
    <ChakraProvider>
      <Box>
        <Text>ID {authInfo.type === 'auth' ? authInfo.authId : 'IDなし'}</Text>
        <Text>所属 {authInfo.type === 'auth' ? authInfo.group : 'グループなし'}</Text>
        <Text></Text>
        {/* <form onSubmit={onSubmit}> */}
        <Input
          // {...inputAttr}
          placeholder="やることを入力してください"
          onChange={handleChange}
          // なぜこれが必要となった!?
          value={title}
        />
        <Button onClick={onSubmit}>追加</Button>
        {/* </form> */}
        <Text></Text>
      </Box>
    </ChakraProvider>
  );
}
