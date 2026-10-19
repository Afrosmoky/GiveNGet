"use client";

import type { ChangeEvent, DragEvent, RefObject } from 'react';
import { LuCheck, LuImagePlus } from 'react-icons/lu';
import { cn } from '../../ui';

interface PhotoDropzoneProps {
  label: string;
  file: File | null;
  isDragOver: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Tekst przycisku, gdy plik jest już wybrany (np. „Zmień logo”). */
  changeLabel: string;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

/** Pole „przeciągnij i upuść albo kliknij” na zdjęcie profilowe / logo. Stan pliku trzyma formularz. */
export function PhotoDropzone({
  label,
  file,
  isDragOver,
  inputRef,
  changeLabel,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
}: PhotoDropzoneProps) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink">
        {label} <span className="font-normal text-ink-subtle">(opcjonalnie)</span>
      </span>
      <button
        type="button"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full flex-col items-center gap-1.5 rounded-ui-md border-2 border-dashed px-4 py-5 text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          isDragOver ? 'border-brand bg-brand-soft' : 'border-line bg-surface-muted hover:border-line-strong'
        )}
      >
        <LuImagePlus size={22} className="text-ink-subtle" aria-hidden />
        <span className="text-sm font-semibold text-ink">{file ? changeLabel : 'Prześlij zdjęcie'}</span>
        <span className="text-xs text-ink-muted">Przeciągnij i upuść plik lub kliknij, aby wybrać</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      {file && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
          <LuCheck size={14} className="shrink-0 text-success" aria-hidden />
          <span className="truncate">
            <strong className="font-medium text-ink">Wybrano:</strong> {file.name}
          </span>
        </p>
      )}
    </div>
  );
}
