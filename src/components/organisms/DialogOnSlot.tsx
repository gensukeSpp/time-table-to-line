import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlotInfo, View } from "react-big-calendar";

import { useAuthInfo } from "../../hooks/useAuthGuard";
import { Dialog } from "../molecules/Dialog";
import { TitleInput } from '../organisms/InputTitleDialog';

interface SlotOpenProps {
  slotInfo?: SlotInfo,
  view?: View,
  onClose?: () => void,
}

export const DialogOnSlot = ({slotInfo, view, onClose}: SlotOpenProps) => {
  const guard = useAuthInfo();
  const isMonth = view === 'month';
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  useEffect(() => {
    setOpenDialog(true);
  }, [slotInfo]);
  // close はローカル state と親 state（slotPicker）の両方をクリアする（pr-32-review 指摘1）。
  // 親が slotInfo を消すことで portal が unmount し、ダイアログのライフサイクルが
  // 親 state に一元化される。useCallback で安定化し、TitleInput 側の
  // useEffect([closeDialog]) が不要に発火しないようにする。
  const handleClose = useCallback(() => {
    setOpenDialog(false);
    onClose?.();
  }, [onClose]);

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