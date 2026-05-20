import * as React from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
} from '@fluentui/react-components';

export interface ConfirmationDialogProps {
  hidden: boolean;
  title: string;
  subText: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  hidden,
  title,
  subText,
  primaryButtonText = 'Confirm',
  secondaryButtonText = 'Cancel',
  onConfirm,
  onDismiss,
}) => {
  return (
    <Dialog open={!hidden} onOpenChange={(_e, data) => { if (!data.open) onDismiss(); }} modalType="alert">
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>{subText}</DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onConfirm}>{primaryButtonText}</Button>
            <Button appearance="secondary" onClick={onDismiss}>{secondaryButtonText}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default ConfirmationDialog;
