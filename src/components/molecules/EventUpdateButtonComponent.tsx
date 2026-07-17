import { FormEvent } from 'react';
import { Button } from '@chakra-ui/react';

import { useDeleteMutation, useUpdateEventMutation } from '../../hooks/useEventMutation';
import { TimelineEventProps } from '../../lib/TimelineType';

export const EventUpdateButtons = (indicateEvent: TimelineEventProps) => {
	const updateEvent = useUpdateEventMutation(indicateEvent.id);
	const deleteEvent = useDeleteMutation(indicateEvent.id);

	const handleUpdate = (e: FormEvent) => {
		e.preventDefault();
		// dispatch({
		// 	type: 'UPDATE',
		// 	payload: indicateEvent
		// });
		updateEvent.mutate({
			...indicateEvent,
			summary: indicateEvent.summary,
			progress: indicateEvent.progress
		});
		console.log(`Update!: ${JSON.stringify(indicateEvent)}`);
	}
	const handleRemove = (e: FormEvent) => {
		e.preventDefault();
		deleteEvent.mutate();
	}

  return (
    <>
      <Button onClick={handleUpdate}>更新</Button>
			<Button onClick={handleRemove}>削除</Button>
    </>
  );
}
