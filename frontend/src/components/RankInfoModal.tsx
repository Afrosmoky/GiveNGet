"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { UserRank, RANK_LABELS, RANK_REQUIREMENTS, RANK_BENEFITS } from '../types/offer';

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
  if (!isOpen) return null;

  const ranks: UserRank[] = ['STARTER', 'RELIABLE_SELLER', 'TRUSTED_PARTNER', 'LOCAL_HERO', 'AMBASSADOR'];

  const getRankIcon = (rank: UserRank) => {
    switch (rank) {
      case 'STARTER':
        return '⭐';
      case 'RELIABLE_SELLER':
        return '🏆';
      case 'TRUSTED_PARTNER':
        return '💎';
      case 'LOCAL_HERO':
        return '🌟';
      case 'AMBASSADOR':
        return '👑';
      default:
        return '⭐';
    }
  };

  const getRankColor = (rank: UserRank) => {
    switch (rank) {
      case 'STARTER':
        return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'RELIABLE_SELLER':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'TRUSTED_PARTNER':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'LOCAL_HERO':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'AMBASSADOR':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              🌟 System Rang i Korzyści
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Jak działają rangi?
            </h3>
            <p className="text-gray-600">
              Rangi są przyznawane na podstawie średniej ocen i punktów zaufania (PZ). 
              Każda ranga oferuje unikalne korzyści i zwiększa Twoją widoczność w aplikacji.
            </p>
          </div>

          {/* Current rank highlight */}
          {currentRank && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getRankIcon(currentRank as UserRank)}</span>
                <div>
                  <h4 className="font-semibold text-yellow-800">
                    Twoja obecna ranga: {RANK_LABELS[currentRank as UserRank]}
                  </h4>
                  <p className="text-yellow-700 text-sm">
                    Średnia ocen: min. {RANK_REQUIREMENTS[currentRank as UserRank].minRating}⭐ | 
                    Punkty zaufania: min. {RANK_REQUIREMENTS[currentRank as UserRank].minTrustPoints} PZ
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ranks list */}
          <div className="space-y-4">
            {ranks.map((rank) => (
              <div 
                key={rank}
                className={`border-2 rounded-xl p-4 transition-all ${
                  currentRank === rank 
                    ? 'border-yellow-400 bg-yellow-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Rank icon and badge */}
                  <div className="flex-shrink-0">
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border ${getRankColor(rank)}`}>
                      <span className="text-lg">{getRankIcon(rank)}</span>
                      <span className="font-medium text-sm">
                        {RANK_LABELS[rank]}
                      </span>
                    </div>
                  </div>

                  {/* Rank details */}
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Requirements */}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Wymagania</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>⭐ Średnia ocen: min. {RANK_REQUIREMENTS[rank].minRating}</div>
                          <div>🏆 Punkty zaufania: min. {RANK_REQUIREMENTS[rank].minTrustPoints} PZ</div>
                          <div>📝 Darmowe oferty: {RANK_REQUIREMENTS[rank].freeOffers}</div>
                        </div>
                      </div>

                      {/* Benefits */}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Korzyści</h4>
                        <ul className="space-y-1">
                          {RANK_BENEFITS[rank].map((benefit, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">✅</span>
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Jak zdobywać punkty zaufania?</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <h5 className="font-medium mb-1">Pozytwne punkty:</h5>
                <ul className="space-y-1">
                  <li>• 5⭐ z komentarzem: +10 PZ</li>
                  <li>• 5⭐ bez komentarza: +5 PZ</li>
                  <li>• 4⭐: +5 PZ</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-1">Negatywne punkty:</h5>
                <ul className="space-y-1">
                  <li>• 2⭐: -10 PZ</li>
                  <li>• 1⭐: -25 PZ</li>
                  <li>• 3⭐: 0 PZ (neutralna)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to ensure it's always on top
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
};

export default RankInfoModal;
