"use client";

import React, { useState } from 'react';
import { UserRank, RANK_LABELS } from '../types/offer';
import RankInfoModal from './RankInfoModal';
import { rankStyle } from './rank/rankStyles';
import { cn } from './ui';

interface UserRankBadgeProps {
  rank?: UserRank | string;
  trustPoints?: number;
  showPoints?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  clickable?: boolean;
}

const SIZES = {
  small: { pill: 'px-2 py-0.5 text-xs', icon: 12 },
  medium: { pill: 'px-2.5 py-1 text-sm', icon: 14 },
  large: { pill: 'px-3 py-1.5 text-base', icon: 16 },
} as const;

export const UserRankBadge: React.FC<UserRankBadgeProps> = ({
  rank = 'STARTER',
  trustPoints = 0,
  showPoints = false,
  size = 'medium',
  className = '',
  clickable = true
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { icon: Icon, pill } = rankStyle(rank);
  const sizes = SIZES[size] ?? SIZES.medium;

  const content = (
    <>
      <Icon size={sizes.icon} aria-hidden className="shrink-0" />
      <span className="font-medium">{RANK_LABELS[rank as UserRank] || 'Nowicjusz'}</span>
      {showPoints && <span className="opacity-75">({trustPoints} PZ)</span>}
    </>
  );
  const classes = cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border', pill, sizes.pill, className);

  if (!clickable) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <>
      <button
        type="button"
        className={cn(classes, 'transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40')}
        onClick={() => setIsModalOpen(true)}
        title="Zobacz, jak działają rangi"
      >
        {content}
      </button>

      <RankInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentRank={rank}
      />
    </>
  );
};

export default UserRankBadge;
