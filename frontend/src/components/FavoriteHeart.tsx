"use client";

import React, { useState } from 'react';
import { FaHeart } from 'react-icons/fa';

interface FavoriteHeartProps {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  loading?: boolean;
  size?: number;
  className?: string;
}

export default function FavoriteHeart({ 
  isFavorite, 
  onClick, 
  loading = false, 
  size = 16,
  className = ""
}: FavoriteHeartProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading) {
      onClick(e);
    }
  };

  const handleMouseEnter = () => {
    if (!loading) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Określ kolor serca na podstawie stanu
  const getHeartColor = () => {
    if (isFavorite) {
      return isHovered ? '#dc2626' : '#ef4444'; // Ciemniejszy czerwony przy hover
    } else {
      return isHovered ? '#ef4444' : '#9ca3af'; // Czerwony przy hover, szary normalnie
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={loading}
      className={`favorite-heart ${className}`}
      style={{
        background: 'none',
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        padding: '4px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        position: 'relative',
        zIndex: 10
      }}
      aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
    >
      <FaHeart
        size={size}
        className={`transition-all duration-200 ${loading ? 'animate-pulse' : ''} hover:scale-110`}
        style={{
          color: getHeartColor(),
          opacity: isFavorite ? 1 : (isHovered ? 0.9 : 0.7),
          filter: isFavorite ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' : 'none',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)'
        }}
      />
    </button>
  );
}
