import { useState, forwardRef, Ref } from 'react';
import { Box, Text, TextInput, NativeSelect, Button } from '@mantine/core';

import { TimelineEventProps } from '../../lib/TimelineType';
import { useDialog } from '../../hooks/useDialog';
import { useAuthInfo } from '../../hooks/useAuthGuard';

import { boundaryTop, boundaryY, buttonPosition } from '../sprinkles.responsive.css';
import { formParent } from './InputItem.css';
import { EventUpdateButtons } from '../molecules/EventUpdateButton';

interface InputEventProps {
	selectedEvent: TimelineEventProps,
	closeClick: () => void
}

type OptionType = {
	value: string;
	label: string;
}
const options: OptionType[] = [
	{value: 'from now', label: 'これから'},
	{value: 'still', label: 'まだ'},
	{value: 'almost', label: 'もうすぐ'},
	{value: 'complete', label: '完了'}
];

export const AddChildForm = forwardRef(
	({selectedEvent, closeClick}: InputEventProps,
		childRef: Ref<HTMLDivElement>) => {

	const [eventItem, setEventItem] = useState<TimelineEventProps>(selectedEvent);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> & React.ChangeEvent<HTMLSelectElement>) => {
		// name, valueという変数名で決まっているようだ
		const {name, value} = e.target;
		    setEventItem({...eventItem, [name]:value});
	}

	// リテラルタイプ化
	const auth = useAuthInfo();
	const authId = auth.type === 'auth' ? auth.authId : undefined;

	const { Dialog, close } = useDialog();

		return (
		  <>
		    <Box ref={childRef} className={formParent}>
		      <Button color="green" onClick={closeClick} className={buttonPosition}>
		        <Text style={{ fontSize: '2rem' }} c="white">×</Text><Text c="white">閉じる</Text>
		      </Button>
		      <Text style={{ fontSize: '2rem' }} fw={700}>{selectedEvent.staff_id}</Text>
		      <Text style={{ fontSize: '2rem' }} fw={700} className={boundaryTop}>{selectedEvent.title}</Text>
		      <section className={boundaryTop}>
		        <Text>内容：</Text>
		        <TextInput name="summary" onChange={handleChange} value={eventItem.summary ?? ''} />
		      </section>
		      <section className={boundaryTop}>
		        <Text>どんな感じ：</Text>
		        <NativeSelect name="progress" value={eventItem.progress ?? ''} onChange={handleChange}
		          data={[
		            '---進捗を選んでください---',
		            ...options.map((option) => option.label),
		          ]}
		        />
		      </section>
		      {authId === selectedEvent.staff_id ?
		        <section className={boundaryY}>
		          <EventUpdateButtons indicateEvent={eventItem} closeInputForm={closeClick}></EventUpdateButtons>
		        </section> : <Box></Box>
		      }
		    </Box>
		    <Box>
		      <Dialog>
		        <Text>異なるスタッフの、変更はできません</Text>
		        <Button onClick={close}>閉じる</Button>
		      </Dialog>
		    </Box>
		  </>
		);
});
