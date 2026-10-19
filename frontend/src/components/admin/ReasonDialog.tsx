"use client";

import { useEffect, useState } from 'react';
import { Button, Dialog, Textarea, type ButtonVariant } from '../ui';

interface ReasonDialogProps {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  hint?: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  onClose: () => void;
  /** Zwraca komunikat błędu albo null przy sukcesie — okno zamyka się tylko po sukcesie. */
  onConfirm: (reason: string) => Promise<string | null>;
}

/** Potwierdzenie operacji z powodem (blokada / usunięcie oferty). */
export function ReasonDialog({
  open,
  title,
  description,
  label,
  placeholder,
  hint,
  confirmLabel,
  confirmVariant = 'danger',
  onClose,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    const result = await onConfirm(reason);
    setSubmitting(false);
    if (result) setError(result);
    else onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
          <Button variant={confirmVariant} loading={submitting} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Textarea label={label} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} hint={hint} rows={4} />
      {error && (
        <p role="alert" className="mt-3 rounded-ui-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
