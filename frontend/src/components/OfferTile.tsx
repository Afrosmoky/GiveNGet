"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '../utils/imageUtils';
import { useFavorites } from '../hooks/useFavorites';
import { useErrorContext } from '../context/ErrorContext';
import FavoriteHeart from './FavoriteHeart';
import { trackOfferClick } from '../utils/auth';

import { OfferTileProps, TransactionType, OfferStatus, STATUS_LABELS } from '../types/offer';
import UserRankBadge from './UserRankBadge';

interface ExtendedOfferTileProps extends OfferTileProps {
  isEditing?: boolean;
  showStatus?: boolean;
  onFavoriteToggle?: (offerId: string, currentIsFavorite: boolean) => Promise<void>;
}

export default function OfferTile({
  id,
  name,
  location,
  imageUrl,
  transactionType,
  status,
  isFavorite = false,
  width = 200,
  height = 220,
  imageWidth = 150,
  imageHeight = 90,
  isEditing = false,
  showStatus = false,
  sellerRank,
  sellerTrustPoints,
  onFavoriteToggle
}: ExtendedOfferTileProps) {
  const { toggleFavorite, loading } = useFavorites();
  const { addError } = useErrorContext();
  const [localIsFavorite, setLocalIsFavorite] = useState(isFavorite);

  // Synchronizuj lokalny stan z propem gdy się zmieni
  useEffect(() => {
    setLocalIsFavorite(isFavorite);
  }, [isFavorite]);

  const getTransactionTypeText = (type: TransactionType) => {
    switch (type) {
      case 'free':
        return 'Za darmo';
      case 'sale':
        return 'Na sprzedaż';
      case 'exchange':
        return 'Wymiana';
      default:
        return '';
    }
  };

  const getStatusColors = (status?: OfferStatus) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: '#dcfce7', text: '#166534' }; // green-100, green-800
      case 'INACTIVE':
        return { bg: '#f3f4f6', text: '#374151' }; // gray-100, gray-800
      case 'PENDING_VERIFICATION':
        return { bg: '#fef3c7', text: '#92400e' }; // yellow-100, yellow-800
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onFavoriteToggle) {
      // Użyj zewnętrznej funkcji do synchronizacji między sekcjami
      await onFavoriteToggle(id, localIsFavorite);
      // Nie aktualizuj lokalnego stanu - będzie zaktualizowany przez rodzica
    } else {
      // Użyj lokalnego hooka (dla kompatybilności wstecznej)
      const newFavoriteState = await toggleFavorite(id, localIsFavorite, addError);
      if (newFavoriteState !== undefined) {
        setLocalIsFavorite(newFavoriteState);
      }
    }
  };

  const handleOfferClick = () => {
    // Zapisz kliknięcie tylko dla ofert nie będących w trybie edycji
    if (!isEditing) {
      trackOfferClick(id);
    }
    // Nie blokujemy propagacji - pozwalamy na normalne działanie Link
  };

  const href = isEditing ? `/offers/edit/${id}` : `/offers/${id}/${name}`;
  
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }} onClick={handleOfferClick}>
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        background: '#f7fafc',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        transition: 'box-shadow 0.2s',
        cursor: 'pointer',
        minWidth: '0',
        flexShrink: 0
      }}>
        {/* Ikona ulubionych */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 10
        }}>
          <FavoriteHeart
            isFavorite={localIsFavorite}
            onClick={handleFavoriteClick}
            loading={loading(id)}
            size={18}
          />
        </div>

        <div style={{
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Image 
            src={getImageUrl(imageUrl)} 
            alt={name} 
            width={imageWidth} 
            height={imageHeight} 
            style={{ objectFit: 'cover' }} 
          />
        </div>
        <div 
          style={{
            width: '100%',
            marginTop: '12px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            height: '22px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '1.2'
          }}
          title={name}
        >
          {name}
        </div>
        <div 
          style={{
            width: '100%',
            textAlign: 'center',
            color: '#666',
            fontSize: '13px',
            height: '18px',
            marginTop: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '1.2'
          }}
          title={location}
        >
          {location}
        </div>
        <div style={{
          width: '100%',
          textAlign: 'center',
          position: 'absolute',
          bottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          alignItems: 'center'
        }}>
          <div style={{
            color: '#888',
            fontSize: '12px'
          }}>
            {getTransactionTypeText(transactionType)}
          </div>
          
          {/* Ranga sprzedawcy */}
          {sellerRank && (
            <div style={{ marginTop: '2px' }}>
              <UserRankBadge 
                rank={sellerRank} 
                trustPoints={sellerTrustPoints}
                showPoints={false}
                size="small"
                clickable={true}
              />
            </div>
          )}
          
          {status && (isEditing || showStatus) && (
            <div style={{
              backgroundColor: getStatusColors(status).bg,
              color: getStatusColors(status).text,
              padding: '2px 6px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '500'
            }}>
              {STATUS_LABELS[status]}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
} 