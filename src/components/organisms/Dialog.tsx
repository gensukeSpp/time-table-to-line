import { useRef, useEffect, useCallback } from "react";
import cx from 'classnames';

import { titleDialog } from "./Dialog.css";
import classes from "./dialog.module.css";

type DialogProps = {
  isOpen?: boolean;
  children?: React.ReactNode;
	onClose?: () => void;
};

export const Dialog: React.FC<DialogProps> = ({
  isOpen = false,
  children,
	onClose
}:DialogProps): React.ReactElement => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect((): void => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) {
      return;
    }
    if (isOpen) {
      if (dialogElement.hasAttribute("open")) {
        return;
      }
      dialogElement.showModal();
    } else {
      if (!dialogElement.hasAttribute("open")) {
        return;
      }
      dialogElement.close();
      console.log("ダイアログ閉じました: effect");
    }
  }, [isOpen]);

	const handleClickDialog = useCallback(
		(event: React.MouseEvent<HTMLDialogElement>): void => {
      [event];
			onClose?.();
      console.log("ダイアログ閉じました: click");
		},
		[onClose]
	);

  return (
    <dialog
      className={classes["dialog"]}
      ref={dialogRef}
      onClick={handleClickDialog}
    >
      <div className={cx(classes["content"], titleDialog)} >
        {children}
      </div>
    </dialog>
  );
};
