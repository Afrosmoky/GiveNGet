import { Badge, type BadgeTone } from './Badge';

/**
 * Statusy widoczne w makietach. Nazwy są UI-owe, nie z API —
 * mapowanie z ReservationStatus robi `reservationPillStatus`.
 */
export type PillStatus = 'pending' | 'collected' | 'expired' | 'cancelled' | 'free' | 'remaining' | 'soldout';

const config: Record<PillStatus, { tone: BadgeTone; label: string; dot: boolean }> = {
  pending: { tone: 'warning', label: 'Oczekuje', dot: true },
  collected: { tone: 'success', label: 'Odebrano', dot: true },
  expired: { tone: 'neutral', label: 'Wygasła', dot: true },
  cancelled: { tone: 'danger', label: 'Anulowana', dot: true },
  free: { tone: 'success', label: 'Za darmo', dot: false },
  remaining: { tone: 'highlight', label: 'Zostało', dot: false },
  soldout: { tone: 'neutral', label: 'Brak sztuk', dot: false },
};

interface StatusPillProps {
  status: PillStatus;
  /** Dla `remaining`: liczba sztuk → „Zostało N”. */
  count?: number;
  /** Nadpisuje domyślną etykietę. */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusPill({ status, count, label, size = 'sm', className }: StatusPillProps) {
  const c = config[status];
  const text = label ?? (status === 'remaining' && count !== undefined ? `Zostało ${count}` : c.label);
  return (
    <Badge tone={c.tone} dot={c.dot} size={size} className={className}>
      {text}
    </Badge>
  );
}

/** Mapowanie statusu rezerwacji z API na wariant plakietki. */
export function reservationPillStatus(status: 'RESERVED' | 'COLLECTED' | 'EXPIRED' | 'CANCELLED'): PillStatus {
  switch (status) {
    case 'RESERVED':
      return 'pending';
    case 'COLLECTED':
      return 'collected';
    case 'EXPIRED':
      return 'expired';
    case 'CANCELLED':
      return 'cancelled';
  }
}
