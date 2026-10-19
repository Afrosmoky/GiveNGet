import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LuChevronRight } from 'react-icons/lu';
import { getImageUrl } from '../../utils/imageUtils';
import { OfferStatus, STATUS_LABELS } from '../../types/offer';
import { Badge, type BadgeTone } from '../ui';

const STATUS_TONE: Record<OfferStatus, BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PENDING_VERIFICATION: 'warning',
};

const TRANSACTION_LABEL: Record<string, string> = { free: 'Za darmo', sale: 'Na sprzedaż', exchange: 'Wymiana' };

interface OfferListRowProps {
  offer: {
    id: string;
    name: string;
    imageUrl?: string | null;
    location?: string | null;
    transactionType: string;
    status?: OfferStatus;
    distance?: string | null;
  };
  href: string;
  onClick?: () => void;
  showStatus?: boolean;
  /** Etykieta akcji po prawej (np. „Edytuj”); domyślnie sama strzałka. */
  actionLabel?: ReactNode;
}

/** Wiersz oferty w widoku listy (ulubione, moje oferty, profil) — alternatywa dla siatki kafelków. */
export function OfferListRow({ offer, href, onClick, showStatus = false, actionLabel }: OfferListRowProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-ui-lg border border-line bg-surface p-3 shadow-card transition-shadow hover:border-line-strong hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-ui-md bg-brand-soft sm:w-24">
        <Image src={getImageUrl(offer.imageUrl)} alt="" fill sizes="96px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{offer.name}</p>
        {offer.location && <p className="truncate text-sm text-ink-muted">{offer.location}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{TRANSACTION_LABEL[offer.transactionType] ?? 'Wymiana'}</Badge>
          {showStatus && offer.status && <Badge tone={STATUS_TONE[offer.status]}>{STATUS_LABELS[offer.status]}</Badge>}
          {offer.distance && <span className="text-xs text-ink-subtle">{offer.distance}</span>}
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand">
        {actionLabel && <span className="hidden sm:inline">{actionLabel}</span>}
        <LuChevronRight size={16} className={actionLabel ? undefined : 'text-ink-subtle'} aria-hidden />
      </span>
    </Link>
  );
}
