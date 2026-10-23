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
		      // Issue #44: 進捗「未定」は in-memory では undefined、送信時は明示的 null にして
		      // バックエンド（model_fields_set 判別）で progress を解除させる。
		      progress: indicateEvent.progress ?? null
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
