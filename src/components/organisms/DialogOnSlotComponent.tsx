import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlotInfo } from "react-big-calendar";

import { useDialog } from "../../hooks/useDialog";
import { useAuthInfo } from "../../hooks/useAuthGuard";
import { Dialog } from "./Dialog";
import { TitleInput } from '../organisms/InputTitleDialog';

interface SlotOpenProps {
  slotInfo?: SlotInfo,
}

export const DialogOnSlot = ({slotInfo}: SlotOpenProps) => {
  // const { Dialog, open, close } = useDialog();
  const guard = useAuthInfo();
  console.log('SlotInfo in dialog: ', slotInfo);
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
          <TitleInput authInfo={guard} slotStartTime={slotInfo.start} closeDialog={handleClose} />
          <button onClick={handleClose}>close</button>
        </Dialog>, document.body)
      }
    </>
  )
}