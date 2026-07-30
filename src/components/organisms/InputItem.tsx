import { useState, FormEvent, forwardRef, Ref } from 'react';
import { Box, Text, TextInput, NativeSelect, Button } from '@mantine/core';
// import Select, { ActionMeta, SingleValue } from 'react-select';

// import { EventItem } from '../../lib/EventItem';
import { TimelineEventProps } from '../../lib/TimelineType';
import { useDialog } from '../../hooks/useDialog';
import { useSearchQuery } from '../../resources/queries';

import { boundaryTop, boundaryY, buttonPosition } from '../sprinkles.responsive.css';
import { formParent } from './InputItem.css';
import { EventUpdateButtons } from '../molecules/EventUpdateButtonComponent';

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

	// const handleSelectChange = (selectedOption: SingleValue<OptionType>/*, actionMeta: ActionMeta<OptionType>*/) => {
	// 	setDone(selectedOption?.label);
	// 	// console.log(actionMeta);
	// }

	// リテラルタイプ化
	  const selectedStaff = `${selectedEvent.staff_id}` as const;
	  const { data: infoContext } = useSearchQuery('userID');

	const { Dialog, open, close } = useDialog();

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
		        <TextInput name="summary" onChange={handleChange} value={eventItem.summary} />
		      </section>
		      <section className={boundaryTop}>
		        <Text>どんな感じ：</Text>
		        <NativeSelect name="progress" value={eventItem.progress} onChange={handleChange}
		          data={[
		            '---進捗を選んでください---',
		            ...options.map((option) => option.label),
		          ]}
		        />
		      </section>
		      {infoContext === selectedStaff ?
		        <section className={boundaryY}>
		          <EventUpdateButtons {...eventItem}></EventUpdateButtons>
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

// export const AddSideForm = forwardRef<HTMLDivElement, selectedEvent>((prop, _ref) => {
// 	return <AddChildForm {...prop} ref />}
// );
