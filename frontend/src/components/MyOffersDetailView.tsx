"use client";

import React, { useState, useEffect, useRef } from 'react';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';
import OfferTile from './OfferTile';
import { OfferTileSkeleton } from './offer/OfferTileSkeleton';
import { OfferTileProps, OfferStatus, STATUS_LABELS } from '../types/offer';
import { LuChevronRight, LuCircleAlert, LuLayoutGrid, LuList, LuPackageOpen } from 'react-icons/lu';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '../utils/imageUtils';
import { Badge, Button, Card, Chip, IconButton, type BadgeTone } from './ui';

const STATUS_TONE: Record<OfferStatus, BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PENDING_VERIFICATION: 'warning',
};

const TRANSACTION_LABEL: Record<string, string> = { free: 'Za darmo', sale: 'Na sprzedaż', exchange: 'Wymiana' };

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4';

export function MyOffersDetailView() {
  const [offers, setOffers] = useState<OfferTileProps[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<OfferTileProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'tiles' | 'list'>('tiles');
  const [statusFilter, setStatusFilter] = useState<OfferStatus | 'ALL'>('ALL');
  const [isMobile, setIsMobile] = useState(false);
  const fetchingRef = useRef(false);

  // Sprawdź czy jesteśmy na urządzeniu mobilnym
  useEffect(() => {
    const updateIsMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 640);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  // Automatycznie ustaw widok na listę na urządzeniach mobilnych
  useEffect(() => {
    if (isMobile && view === 'tiles') {
      setView('list');
    }
  }, [isMobile, view]);

  // Filtruj oferty według statusu
  useEffect(() => {
    if (statusFilter === 'ALL') {
      setFilteredOffers(offers);
    } else {
      setFilteredOffers(offers.filter(offer => offer.status === statusFilter));
    }
  }, [offers, statusFilter]);

  useEffect(() => {
    const fetchMyOffers = async () => {
      // Zapobiegaj podwójnym zapytaniom
      if (fetchingRef.current) return;
      
      fetchingRef.current = true;
      try {
        setLoading(true);
        setError(null);
        
        const response = await authorizedFetch(`${environment.apiUrl}/api/offer/my`);
        
        if (response.ok) {
          const data = await response.json();
          setOffers(data);
        } else {
          setError('Błąd pobierania ofert');
        }
      } catch (error) {
        console.error('Błąd połączenia:', error);
        setError('Błąd połączenia z serwerem');
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchMyOffers();
  }, []);

  if (loading) {
    return (
      <div className={GRID} aria-busy="true" aria-label="Wczytywanie ofert">
        {Array.from({ length: 4 }, (_, i) => (
          <OfferTileSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card padding="lg" role="alert" className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
          <LuCircleAlert size={22} aria-hidden />
        </span>
        <p className="text-sm text-ink">{error}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtr statusu + przełącznik widoku */}
      <div className="flex items-start justify-between gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filtruj według statusu">
          <Chip selected={statusFilter === 'ALL'} count={offers.length} onClick={() => setStatusFilter('ALL')} className="shrink-0">
            Wszystkie
          </Chip>
          {(['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION'] as const).map((status) => (
            <Chip
              key={status}
              selected={statusFilter === status}
              count={offers.filter((offer) => offer.status === status).length}
              onClick={() => setStatusFilter(status)}
              className="shrink-0"
            >
              {STATUS_LABELS[status]}
            </Chip>
          ))}
        </div>
        {!isMobile && (
          <div className="flex shrink-0 gap-1 rounded-ui-md border border-line bg-surface p-0.5">
            <IconButton label="Widok kafelków" icon={<LuLayoutGrid size={18} />} active={view === 'tiles'} onClick={() => setView('tiles')} className="h-8 w-8" />
            <IconButton label="Widok listy" icon={<LuList size={18} />} active={view === 'list'} onClick={() => setView('list')} className="h-8 w-8" />
          </div>
        )}
      </div>

      {offers.length === 0 ? (
        <Card padding="lg" className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <LuPackageOpen size={22} aria-hidden />
          </span>
          <p className="text-sm text-ink-muted">Nie masz jeszcze żadnych ofert.</p>
          <Button href="/create-offer">Dodaj pierwszą ofertę</Button>
        </Card>
      ) : filteredOffers.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">Brak ofert z wybranym statusem.</p>
      ) : view === 'tiles' ? (
        <div className={GRID}>
          {filteredOffers.map((offer) => (
            <OfferTile key={offer.id} {...offer} isEditing />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredOffers.map((offer) => (
            <li key={offer.id}>
              <Link
                href={`/offers/edit/${offer.id}`}
                className="flex items-center gap-3 rounded-ui-lg border border-line bg-surface p-3 shadow-card transition-shadow hover:border-line-strong hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-ui-md bg-brand-soft sm:h-16 sm:w-24">
                  <Image src={getImageUrl(offer.imageUrl)} alt="" fill sizes="96px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{offer.name}</p>
                  {offer.location && <p className="truncate text-sm text-ink-muted">{offer.location}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="brand">{TRANSACTION_LABEL[offer.transactionType] ?? 'Wymiana'}</Badge>
                    {offer.status && <Badge tone={STATUS_TONE[offer.status]}>{STATUS_LABELS[offer.status]}</Badge>}
                    {offer.distance && <span className="text-xs text-ink-subtle">{offer.distance}</span>}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand">
                  <span className="hidden sm:inline">Edytuj</span>
                  <LuChevronRight size={16} aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
