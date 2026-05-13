"use client";

import { useRouter, usePathname } from 'next/navigation';
import { FaSearch, FaHeart, FaPlus, FaComments, FaUser } from 'react-icons/fa';

export default function MobileFooter() {
  const router = useRouter();
  const pathname = usePathname();

  const handleSearchOffers = () => {
    router.push('/offers/search');
  };

  const handleCreateOffer = () => {
    router.push('/create-offer');
  };

  const handleFavorites = () => {
    router.push('/favorites');
  };

  const handleChats = () => {
    router.push('/chats');
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="mobile-bottom-nav">
      <div className="mobile-nav-buttons">
        <button
          onClick={handleSearchOffers}
          className={`mobile-nav-button ${isActive('/offers/search') ? 'mobile-nav-button-active' : ''}`}
        >
          <FaSearch size={20} />
          <span>Szukaj</span>
        </button>
        
        <button
          onClick={handleFavorites}
          className={`mobile-nav-button ${isActive('/favorites') ? 'mobile-nav-button-active' : ''}`}
        >
          <FaHeart size={20} />
          <span>Obserwujesz</span>
        </button>
        
        <button
          onClick={handleCreateOffer}
          className="mobile-add-button"
        >
          <div className="mobile-add-button-circle">
            <FaPlus size={24} />
          </div>
          <span className="text-sm">Dodaj</span>
        </button>
        
        <button
          onClick={handleChats}
          className={`mobile-nav-button ${isActive('/chats') ? 'mobile-nav-button-active' : ''}`}
        >
          <FaComments size={20} />
          <span>Czat</span>
        </button>
        
        <button
          onClick={handleProfile}
          className={`mobile-nav-button ${isActive('/profile') ? 'mobile-nav-button-active' : ''}`}
        >
          <FaUser size={20} />
          <span>Konto</span>
        </button>
      </div>
    </div>
  );
}
