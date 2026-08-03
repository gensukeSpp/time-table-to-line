import { FormEvent } from 'react';
import { Button } from '@mantine/core';

import { useDeleteMutation, useUpdateEventMutation } from '../../hooks/useEventMutation';
import { TimelineEventProps } from '../../lib/TimelineType';

interface EventUpdateButtonsProps {
  indicateEvent: TimelineEventProps;
  closeInputForm: () => void;
}

export const EventUpdateButtons = ({ indicateEvent, closeInputForm }: EventUpdateButtonsProps) => {
	const updateEvent = useUpdateEventMutation(indicateEvent.id);
	const deleteEvent = useDeleteMutation(indicateEvent.id);

	const handleUpdate = (e: FormEvent) => {
		e.preventDefault();
		updateEvent.mutate({
		      ...indicateEvent,
		      summary: indicateEvent.summary,
		      progress: indicateEvent.progress
		    }, {
		      onSuccess: closeInputForm
		    });
	  }
	const handleRemove = (e: FormEvent) => {
		e.preventDefault();
		deleteEvent.mutate(undefined, {
			onSuccess: closeInputForm
		});
	}

  return (
    <>
      <Button onClick={handleUpdate}>更新</Button>
			<Button onClick={handleRemove}>削除</Button>
    </>
  );
}
