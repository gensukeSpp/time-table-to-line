import { useState, useRef, useCallback, PropsWithChildren } from "react";
import { Box } from '@mantine/core';

import { TimelineEventProps, EventFormProps } from "../lib/TimelineType";
import { topWidth } from "../components/sprinkles.responsive.css";

export const useCallingEditForm = ({onShowFormView}: EventFormProps) => {

  /**
   * Issue summary & progress
   */
  const [showModal, setShowModal] = useState(false);

  // TypeScriptでReactのイベントにどう型指定するか
  // https://komari.co.jp/blog/10724/
  const handleOuterFormBubbling = (e: React.MouseEvent<HTMLDivElement>) => {
    if(!(e.target instanceof HTMLButtonElement)){
      return;
    }
    setShowModal(false);
  }

  const countRef = useRef<number | undefined>(undefined);
  const handleSelectEvent = useCallback((callingEvent: TimelineEventProps) => {
    onShowFormView(callingEvent);
    countRef.current = undefined;
    
    setShowModal(true);
  }, []);

  const closeInputForm = () => {
    setShowModal(false);
  }

  const EditForm: React.FC<PropsWithChildren> = ({children}) => {
    return (
      <Box style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
        className={topWidth}
        onClick={handleOuterFormBubbling}>
          {children}
      </Box>
    )
  }

  const modal = {showModal, closeInputForm};
  return {handleSelectEvent, EditForm, modal};
}
