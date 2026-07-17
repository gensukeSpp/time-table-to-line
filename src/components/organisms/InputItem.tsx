import { useState, FormEvent, forwardRef, Ref } from 'react';
import { ChakraProvider, Box, Text, Input, Button, Select } from '@chakra-ui/react';
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
	// const [done, setDone] = useState<string | undefined>(options[0].value);
	// 君から卒業
	// const dispatch = useEventsDispatch();
  console.log(`Handle event: ${JSON.stringify(selectedEvent)}`);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement> & React.ChangeEvent<HTMLSelectElement>) => {
		// name, valueという変数名で決まっているようだ
		const {name, value} = e.target;
		console.log(`event.target name: ${name}`);
		setEventItem({...eventItem, [name]:value});
	}

	// const handleSelectChange = (selectedOption: SingleValue<OptionType>/*, actionMeta: ActionMeta<OptionType>*/) => {
	// 	setDone(selectedOption?.label);
	// 	// console.log(actionMeta);
	// }

	// リテラルタイプ化
	const selectedStaff = `${selectedEvent.staff_id}` as const;
	const { data: infoContext } = useSearchQuery('userID');
	// infoContext === selectedStaff
	// 	? console.log(`Target event staff: ${infoContext}, Passing!`)
	// 	: console.log(`Parse staff: ${selectedStaff}, Dout!`);

	const { Dialog, open, close } = useDialog();

	return (
		<ChakraProvider>
			<Box ref={childRef} className={formParent}>
				<Button type='button' backgroundColor='green' onClick={closeClick} className={buttonPosition}>
					<Text fontSize='2rem' color='white'>×</Text><Text color='white'>閉じる</Text>
				</Button>
				<Text fontSize='2rem' fontWeight='bold'>{selectedEvent.staff_id}</Text>
				<Text fontSize='2rem' fontWeight='bold' className={boundaryTop}>{selectedEvent.title}</Text>
				<section className={boundaryTop}>
					<Text>内容：</Text>
					<Input name="summary" onChange={handleChange} value={eventItem.summary} />
				</section>
				<section className={boundaryTop}>
					<Text>どんな感じ：</Text>
					<Select name="progress" value={eventItem.progress} onChange={handleChange}>
						<option>---進捗を選んでください---</option>
						{options.map((option) => {
							return (
								<option value={option.label} key={option.value}>{option.label}</option>
							);
							})
						}
					</Select>
					{/* <Select options={options} onChange={handleSelectChange} /> */}
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
					<Button textAlign='center' onClick={close}>閉じる</Button>
				</Dialog>
			</Box>
		</ChakraProvider>
	);
});

// export const AddSideForm = forwardRef<HTMLDivElement, selectedEvent>((prop, _ref) => {
// 	return <AddChildForm {...prop} ref />}
// );
