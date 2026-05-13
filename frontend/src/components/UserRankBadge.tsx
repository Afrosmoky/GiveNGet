"use client";

import React, { useState } from 'react';
import { UserRank, RANK_LABELS } from '../types/offer';
import RankInfoModal from './RankInfoModal';

interface UserRankBadgeProps {
  rank?: UserRank | string;
  trustPoints?: number;
  showPoints?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  clickable?: boolean;
}

export const UserRankBadge: React.FC<UserRankBadgeProps> = ({
  rank = 'STARTER',
  trustPoints = 0,
  showPoints = false,
  size = 'medium',
  className = '',
  clickable = true
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const getRankColor = (rank: UserRank | string) => {
    switch (rank) {
      case 'STARTER':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-300',
          icon: '⭐'
        };
      case 'RELIABLE_SELLER':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-300',
          icon: '🏆'
        };
      case 'TRUSTED_PARTNER':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          border: 'border-purple-300',
          icon: '💎'
        };
      case 'LOCAL_HERO':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          border: 'border-orange-300',
          icon: '🌟'
        };
      case 'AMBASSADOR':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-300',
          icon: '👑'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-300',
          icon: '⭐'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'text-xs',
          text: 'text-xs'
        };
      case 'medium':
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'text-sm',
          text: 'text-sm'
        };
      case 'large':
        return {
          container: 'px-4 py-2 text-base',
          icon: 'text-base',
          text: 'text-base'
        };
      default:
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'text-sm',
          text: 'text-sm'
        };
    }
  };

  const colors = getRankColor(rank);
  const sizes = getSizeClasses();

  const handleClick = () => {
    if (clickable) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div 
        className={`inline-flex items-center gap-1.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizes.container} ${className} ${
          clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
        }`}
        onClick={handleClick}
        title={clickable ? 'Kliknij aby zobaczyć informacje o rangach' : ''}
      >
        <span className={sizes.icon}>{colors.icon}</span>
        <span className={`font-medium ${sizes.text}`}>
          {RANK_LABELS[rank as UserRank] || 'Nowicjusz'}
        </span>
        {showPoints && (
          <span className={`${sizes.text} opacity-75`}>
            ({trustPoints} PZ)
          </span>
        )}
      </div>

      <RankInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentRank={rank}
      />
    </>
  );
};

export default UserRankBadge;
