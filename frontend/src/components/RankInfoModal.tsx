"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { LuCircleCheck, LuLightbulb } from 'react-icons/lu';
import { UserRank, RANK_LABELS, RANK_REQUIREMENTS, RANK_BENEFITS } from '../types/offer';
import { RANKS, rankStyle } from './rank/rankStyles';
import { Dialog, cn } from './ui';

interface RankInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRank?: UserRank | string;
}

export const RankInfoModal: React.FC<RankInfoModalProps> = ({
  isOpen,
  onClose,
  currentRank
}) => {
  if (!isOpen || typeof window === 'undefined') return null;

  const current = RANKS.includes(currentRank as UserRank) ? (currentRank as UserRank) : null;

  // Portal: badge bywa w kafelku z transformacją, która psułaby position: fixed okna
  return createPortal(
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Rangi i korzyści"
      description="Rangi przyznajemy na podstawie średniej ocen i punktów zaufania (PZ)."
    >
      {current && (
        <div className="mb-4 rounded-ui-md border border-brand/20 bg-brand-soft px-4 py-3 text-sm">
          <p className="font-semibold text-brand-strong">Twoja obecna ranga: {RANK_LABELS[current]}</p>
          <p className="mt-0.5 text-ink-muted">
            Średnia ocen: min. {RANK_REQUIREMENTS[current].minRating} · Punkty zaufania: min.{' '}
            {RANK_REQUIREMENTS[current].minTrustPoints} PZ
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {RANKS.map((rank) => {
          const { icon: Icon, pill } = rankStyle(rank);
          return (
            <li
              key={rank}
              className={cn(
                'rounded-ui-lg border p-4',
                current === rank ? 'border-brand bg-brand-soft/40' : 'border-line bg-surface'
              )}
            >
              <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium', pill)}>
                <Icon size={14} aria-hidden />
                {RANK_LABELS[rank]}
              </span>
              <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <h4 className="mb-1 font-semibold text-ink">Wymagania</h4>
                  <ul className="space-y-0.5 text-ink-muted">
                    <li>Średnia ocen: min. {RANK_REQUIREMENTS[rank].minRating}</li>
                    <li>Punkty zaufania: min. {RANK_REQUIREMENTS[rank].minTrustPoints} PZ</li>
                    <li>Darmowe oferty: {RANK_REQUIREMENTS[rank].freeOffers}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-ink">Korzyści</h4>
                  <ul className="space-y-1">
                    {RANK_BENEFITS[rank].map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2 text-ink-muted">
                        <LuCircleCheck size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 rounded-ui-md bg-surface-muted px-4 py-3 text-sm">
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-ink">
          <LuLightbulb size={16} className="text-brand-accent" aria-hidden />
          Jak zdobywać punkty zaufania?
        </h4>
        <div className="grid gap-3 text-ink-muted sm:grid-cols-2">
          <div>
            <h5 className="mb-1 font-medium text-ink">Dodatnie punkty</h5>
            <ul className="space-y-0.5">
              <li>5★ z komentarzem: +10 PZ</li>
              <li>5★ bez komentarza: +5 PZ</li>
              <li>4★: +5 PZ</li>
            </ul>
          </div>
          <div>
            <h5 className="mb-1 font-medium text-ink">Ujemne punkty</h5>
            <ul className="space-y-0.5">
              <li>2★: −10 PZ</li>
              <li>1★: −25 PZ</li>
              <li>3★: 0 PZ (neutralna)</li>
            </ul>
          </div>
        </div>
      </div>
    </Dialog>,
    document.body
  );
};

export default RankInfoModal;
