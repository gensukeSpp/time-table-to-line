import { ComponentProps, useCallback, useState } from "react";

import { Dialog as Component } from "../components/molecules/Dialog";

type UseDialogProp = Omit<
  ComponentProps<typeof Component>,
  "isOpen" | "onClose" | "rootElement"
>;

type Result = {
  open: () => void;
  Dialog: React.FC<UseDialogProp>;
  close: () => void;
};

export const useDialog = (): Result => {
  const [isOpen, setOpen] = useState<boolean>(false);

  const open = useCallback((): void => {
    
    setOpen(true);
  }, []);

  const close = useCallback((): void => {
    setOpen(false);
  }, []);

  const Dialog: React.FC<UseDialogProp> = useCallback(
    (prop: UseDialogProp): React.ReactNode => {
      return <div><Component isOpen={isOpen} onClose={close} {...prop} /></div>;
    }, [isOpen]);

  return { open, close, Dialog };
};
