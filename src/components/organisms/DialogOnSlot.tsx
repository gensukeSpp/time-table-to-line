import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlotInfo, View } from "react-big-calendar";

import { useAuthInfo } from "../../hooks/useAuthGuard";
import { Dialog } from "../molecules/Dialog";
import { TitleInput } from '../organisms/InputTitleDialog';

interface SlotOpenProps {
  slotInfo?: SlotInfo,
  view?: View,
}

export const DialogOnSlot = ({slotInfo, view}: SlotOpenProps) => {
  const guard = useAuthInfo();
  const isMonth = view === 'month';
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  useEffect(() => {
    setOpenDialog(true);
  }, [slotInfo]);
  const handleClose = () => {
    slotInfo = undefined;
    setOpenDialog(false);
  }

  return (
    <>
      {slotInfo && createPortal(
        <Dialog isOpen={openDialog} {...slotInfo}>
          <p>入力フォームコンテンツ</p>
          <TitleInput authInfo={guard} slotStartTime={slotInfo.start} isMonth={isMonth} closeDialog={handleClose} />
          <button onClick={handleClose}>close</button>
        </Dialog>, document.body)
      }
    </>
  )
}