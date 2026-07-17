import { forwardRef, Ref } from "react";
import { ChakraProvider, Box, Button, Text } from "@chakra-ui/react";

import { useUpdateDateListMutation } from "../../hooks/useEventMutation";
import { ChangingButtonProp } from "../../lib/TimelineType";
import { updateButtonArea } from "./TimeUpdateButtonComponent.css";

export const TimesUpdateButton = forwardRef(
  ({timeChangeEvents}: ChangingButtonProp, buttonRef: Ref<HTMLDivElement>) => {
  console.log(`Event list =: `, timeChangeEvents);

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
      console.log('Inner setTimeout');
    }, 250);
  }
  const handleReset = () => {
    updateEvents.mutate([]);
    timeChangeEvents.splice(0);
    console.log('Outer setTimeout');
  }

  const handleUpdate = () => {
    updateEvents.mutate(timeChangeEvents);
    // console.log('Updateしたつもり');
    resetAction();
    console.log('Outer setTimeout');
  }

  return (
    <ChakraProvider>
      {timeChangeEvents.length > 0 &&
        <Box className={updateButtonArea.container} ref={buttonRef}>
          <Button onClick={handleUpdate}>変更する</Button>
          <Text className={updateButtonArea.countText}>変更回数: {timeChangeEvents.length}</Text>
          <Button onClick={handleReset}>リセット</Button>
        </Box>
      }
    </ChakraProvider>
  );
});
