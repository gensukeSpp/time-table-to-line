import { useState, useRef, useCallback, PropsWithChildren } from "react";
import { chakra } from "@chakra-ui/system";

import { TimelineEventProps, EventFormProps } from "../lib/TimelineType";
import { topWidth } from "../components/sprinkles.responsive.css";

export const useCallingEditForm = ({onShowFormView, targetEvent}: EventFormProps) => {

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

  const countRef = useRef<number | undefined>();
  const handleSelectEvent = useCallback((callingEvent: TimelineEventProps) => {
    onShowFormView(callingEvent);
    countRef.current = undefined;
    console.log('切り替わりました Handle: ', countRef.current);
    setShowModal(true);
  }, []);

  const closeInputForm = () => {
    setShowModal(false);
  }

  const EditForm: React.FC<PropsWithChildren> = ({children}) => {
    return (
      <chakra.div flexShrink="0" scrollSnapAlign="start"
        className={topWidth}
        onClick={handleOuterFormBubbling}>
          {children}
      </chakra.div>
    )
  }

  const modal = {showModal, closeInputForm};
  return {handleSelectEvent, EditForm, modal};
}
