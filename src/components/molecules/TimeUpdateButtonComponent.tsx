import { forwardRef, Ref } from "react";
import { Box, Button, Text } from '@mantine/core';

import { useUpdateDateListMutation } from "../../hooks/useEventMutation";
import { ChangingButtonProp } from "../../lib/TimelineType";
import { updateButtonArea } from "./TimeUpdateButtonComponent.css";

export const TimesUpdateButton = forwardRef(
  ({timeChangeEvents}: ChangingButtonProp, buttonRef: Ref<HTMLDivElement>) => {

  // idのだけの配列
  const timeChangeEventIds = timeChangeEvents.map(
    timeChangeEvent => timeChangeEvent.id.toString()
  );

  const updateEvents = useUpdateDateListMutation(timeChangeEventIds);
  const resetAction = () => {
    setTimeout(() => {
      // クラウドではこちらでOK
      // timeChangeEvents.splice(0);
      handleReset();
    }, 250);
  }
  const handleReset = () => {
    updateEvents.mutate([]);
    timeChangeEvents.splice(0);
  }

  const handleUpdate = () => {
    updateEvents.mutate(timeChangeEvents);
    resetAction();
  }

  return (
    <>
      {timeChangeEvents.length > 0 &&
        <Box className={updateButtonArea.container} ref={buttonRef}>
          <Button onClick={handleUpdate}>変更する</Button>
          <Text className={updateButtonArea.countText}>変更回数: {timeChangeEvents.length}</Text>
          <Button onClick={handleReset} variant="default">リセット</Button>
        </Box>
      }
    </>
  );
});
