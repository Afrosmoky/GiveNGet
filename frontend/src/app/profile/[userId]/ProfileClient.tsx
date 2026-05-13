"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FaListUl, FaTableCells } from 'react-icons/fa6';
import Image from 'next/image';
import { getImageUrl } from '../../../utils/imageUtils';
import { environment } from '../../../config';
import { authorizedFetch, trackOfferClick } from '../../../utils/auth';
import OfferTile from '../../../components/OfferTile';
import { OfferTile as OfferTileType } from '../../../types/offer';

const GoogleMapComponent = dynamic(() => import('../../../components/GoogleMapComponent'), { ssr: false });

export interface UserProfileData {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  location?: string | null;
  lat: number;
  lon: number;
  userType: string;
  id: string; // Added for rate submission
}

export interface RateData {
  rate: number;
  count: number;
}

export interface NewRateData {
  cleanliness: number;
  quality: number;
  transactionRating: number;
  averageRating: number;
  comment: string;
  createdAt: string;
}

export interface NewStarStats {
  cleanlinessOneStarCount: number;
  cleanlinessTwoStarCount: number;
  cleanlinessThreeStarCount: number;
  cleanlinessFourStarCount: number;
  cleanlinessFiveStarCount: number;
  qualityOneStarCount: number;
  qualityTwoStarCount: number;
  qualityThreeStarCount: number;
  qualityFourStarCount: number;
  qualityFiveStarCount: number;
  transactionOneStarCount: number;
  transactionTwoStarCount: number;
  transactionThreeStarCount: number;
  transactionFourStarCount: number;
  transactionFiveStarCount: number;
}



export default function ProfileClient({ userData, offers, rate }: { userData: UserProfileData, offers: OfferTileType[], rate: RateData }) {
  const [view, setView] = useState<'tiles' | 'list'>('tiles');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOpinionsModal, setShowOpinionsModal] = useState(false);
  const [opinions, setOpinions] = useState<NewRateData[]>([]);
  const [loadingOpinions, setLoadingOpinions] = useState(false);
  const [errorOpinions, setErrorOpinions] = useState<string | null>(null);
  const [starStats, setStarStats] = useState<NewStarStats>({
    cleanlinessOneStarCount: 0,
    cleanlinessTwoStarCount: 0,
    cleanlinessThreeStarCount: 0,
    cleanlinessFourStarCount: 0,
    cleanlinessFiveStarCount: 0,
    qualityOneStarCount: 0,
    qualityTwoStarCount: 0,
    qualityThreeStarCount: 0,
    qualityFourStarCount: 0,
    qualityFiveStarCount: 0,
    transactionOneStarCount: 0,
    transactionTwoStarCount: 0,
    transactionThreeStarCount: 0,
    transactionFourStarCount: 0,
    transactionFiveStarCount: 0
  });
  const [selectedRatings, setSelectedRatings] = useState({
    cleanliness: 0,
    quality: 0,
    transactionRating: 0
  });
  const [hoveredRatings, setHoveredRatings] = useState({
    cleanliness: 0,
    quality: 0,
    transactionRating: 0
  });
  const [selectedStarsFilter, setSelectedStarsFilter] = useState<{ category: 'cleanliness' | 'quality' | 'transactionRating', stars: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingNextPage, setLoadingNextPage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fetchingOpinionsRef = useRef<string | null>(null);
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
  const sectionWidth = 700;
  const tileWidth = 200;
  const tileHeight = 220;
  // Ustawienia responsywne dla sekcji statystyk gwiazdek (mobile/desktop)

  // Funkcja do renderowania gwiazdek (statycznych)
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasPartialStar = rating % 1 !== 0;
    const partialStarPercentage = (rating % 1) * 100;

    // Pełne gwiazdki
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={`full-${i}`} width="22" height="22" viewBox="0 0 24 24" fill="#fbbf24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      );
    }

    // Częściowa gwiazdka (jeśli istnieje)
    if (hasPartialStar) {
      stars.push(
        <div key="partial" style={{ position: 'relative', width: 22, height: 22 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#e2e8f0">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, width: `${partialStarPercentage}%`, height: '100%', overflow: 'hidden' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fbbf24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </div>
        </div>
      );
    }

    // Puste gwiazdki
    const emptyStars = 5 - fullStars - (hasPartialStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} width="22" height="22" viewBox="0 0 24 24" fill="#e2e8f0">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      );
    }

    return stars;
  };

  // Funkcja do renderowania interaktywnych gwiazdek
  const renderInteractiveStars = (rating: number, onStarClick: (rating: number) => void, onStarHover: (rating: number) => void, onStarLeave: () => void) => {
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      let fillColor = "#e2e8f0";
      if (hoveredRating > 0) {
        fillColor = i <= hoveredRating ? "#fbbf24" : "#e2e8f0";
        stars.push(
          <svg
            key={i}
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={fillColor}
            style={{ cursor: 'pointer' }}
            onClick={() => onStarClick(i)}
            onMouseEnter={() => onStarHover(i)}
            onMouseLeave={onStarLeave}
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        );
      } else {
        if (i <= Math.floor(rating)) {
          // pełna gwiazdka
          fillColor = "#fbbf24";
          stars.push(
            <svg
              key={i}
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={fillColor}
              style={{ cursor: 'pointer' }}
              onClick={() => onStarClick(i)}
              onMouseEnter={() => onStarHover(i)}
              onMouseLeave={onStarLeave}
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          );
        } else if (i === Math.floor(rating) + 1 && rating % 1 !== 0) {
          // częściowa gwiazdka
          const partialPercentage = (rating % 1) * 100;
          stars.push(
            <div key={i} style={{ position: 'relative', width: 22, height: 22, display: 'inline-block' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#e2e8f0" style={{ cursor: 'pointer', position: 'absolute', top: 0, left: 0 }}
                onClick={() => onStarClick(i)}
                onMouseEnter={() => onStarHover(i)}
                onMouseLeave={onStarLeave}
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: `${partialPercentage}%`, height: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#fbbf24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
            </div>
          );
        } else {
          // pusta gwiazdka
          stars.push(
            <svg
              key={i}
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="#e2e8f0"
              style={{ cursor: 'pointer' }}
              onClick={() => onStarClick(i)}
              onMouseEnter={() => onStarHover(i)}
              onMouseLeave={onStarLeave}
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          );
        }
      }
    }
    return stars;
  };

  // Funkcje do obsługi interakcji z gwiazdkami
  const handleStarClick = (rating: number) => {
    setSelectedRatings({ cleanliness: rating, quality: rating, transactionRating: rating });
    setShowRatingModal(true);
  };

  const handleStarHover = (rating: number) => {
    setHoveredRating(rating);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleModalStarClick = (category: 'cleanliness' | 'quality' | 'transactionRating', rating: number) => {
    setSelectedRatings(prev => ({ ...prev, [category]: rating }));
  };

  const handleModalStarHover = (category: 'cleanliness' | 'quality' | 'transactionRating', rating: number) => {
    setHoveredRatings(prev => ({ ...prev, [category]: rating }));
  };

  const handleModalStarLeave = (category: 'cleanliness' | 'quality' | 'transactionRating') => {
    setHoveredRatings(prev => ({ ...prev, [category]: 0 }));
  };

  const handleSubmitRating = async () => {
    if (selectedRatings.cleanliness === 0 || selectedRatings.quality === 0 || selectedRatings.transactionRating === 0) return;
    setIsSubmitting(true);
    try {
      const body = {
        cleanliness: selectedRatings.cleanliness,
        quality: selectedRatings.quality,
        transactionRating: selectedRatings.transactionRating,
        comment: comment.trim() || null,
        userId: userData.id
      };
      const response = await authorizedFetch(`${environment.apiUrl}/api/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        throw new Error('Błąd podczas wysyłania opinii');
      }
      setShowRatingModal(false);
      setSelectedRatings({ cleanliness: 0, quality: 0, transactionRating: 0 });
      setHoveredRatings({ cleanliness: 0, quality: 0, transactionRating: 0 });
      setComment('');
      setHoveredRating(0);
      // TODO: Odświeżenie danych po wysłaniu oceny
    } catch (error) {
      console.error('Błąd wysyłania oceny:', error);
      // Możesz dodać wyświetlanie błędu w UI
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowRatingModal(false);
    setSelectedRatings({ cleanliness: 0, quality: 0, transactionRating: 0 });
    setHoveredRatings({ cleanliness: 0, quality: 0, transactionRating: 0 });
    setComment('');
    setHoveredRating(0);
  };

  const fetchOpinions = async (stars?: number, page: number = 0, append = false) => {
    // Zapobiegaj podwójnym zapytaniom dla tego samego requestu
    const requestKey = `${stars}-${page}-${append}`;
    if (fetchingOpinionsRef.current === requestKey) return;
    
    fetchingOpinionsRef.current = requestKey;
    if (page > 0) setLoadingNextPage(true);
    else setLoadingOpinions(true);
    setErrorOpinions(null);
    try {
      let url = `${environment.apiUrl}/api/rates?userId=${userData.id}`;
      if (stars) url += `&stars=${stars}`;
      url += `&page=${page}`;
      const response = await authorizedFetch(url);
      if (!response.ok) throw new Error('Błąd pobierania opinii');
      const data = await response.json();
      setStarStats({
        cleanlinessOneStarCount: data.cleanlinessOneStarCount || 0,
        cleanlinessTwoStarCount: data.cleanlinessTwoStarCount || 0,
        cleanlinessThreeStarCount: data.cleanlinessThreeStarCount || 0,
        cleanlinessFourStarCount: data.cleanlinessFourStarCount || 0,
        cleanlinessFiveStarCount: data.cleanlinessFiveStarCount || 0,
        qualityOneStarCount: data.qualityOneStarCount || 0,
        qualityTwoStarCount: data.qualityTwoStarCount || 0,
        qualityThreeStarCount: data.qualityThreeStarCount || 0,
        qualityFourStarCount: data.qualityFourStarCount || 0,
        qualityFiveStarCount: data.qualityFiveStarCount || 0,
        transactionOneStarCount: data.transactionOneStarCount || 0,
        transactionTwoStarCount: data.transactionTwoStarCount || 0,
        transactionThreeStarCount: data.transactionThreeStarCount || 0,
        transactionFourStarCount: data.transactionFourStarCount || 0,
        transactionFiveStarCount: data.transactionFiveStarCount || 0
      });
      setCurrentPage(data.currentPage ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (append) {
        setOpinions(prev => [...prev, ...(Array.isArray(data.ratesList) ? data.ratesList : [])]);
      } else {
        setOpinions(Array.isArray(data.ratesList) ? data.ratesList : []);
      }
    } catch {
      setErrorOpinions('Nie udało się pobrać opinii.');
      setStarStats({
        cleanlinessOneStarCount: 0,
        cleanlinessTwoStarCount: 0,
        cleanlinessThreeStarCount: 0,
        cleanlinessFourStarCount: 0,
        cleanlinessFiveStarCount: 0,
        qualityOneStarCount: 0,
        qualityTwoStarCount: 0,
        qualityThreeStarCount: 0,
        qualityFourStarCount: 0,
        qualityFiveStarCount: 0,
        transactionOneStarCount: 0,
        transactionTwoStarCount: 0,
        transactionThreeStarCount: 0,
        transactionFourStarCount: 0,
        transactionFiveStarCount: 0
      });
      setOpinions([]);
    } finally {
      setLoadingOpinions(false);
      setLoadingNextPage(false);
      fetchingOpinionsRef.current = null;
    }
  };

  const handleOpenOpinionsModal = async () => {
    setShowOpinionsModal(true);
    setSelectedStarsFilter(null);
    setCurrentPage(0);
    setTotalPages(1);
    setOpinions([]);
    await fetchOpinions(undefined, 0, false);
  };

  const handleFilterByStars = async (category: 'cleanliness' | 'quality' | 'transactionRating', stars: number) => {
    const newFilter = { category, stars };
    if (selectedStarsFilter?.category === category && selectedStarsFilter?.stars === stars) {
      setSelectedStarsFilter(null);
      setCurrentPage(0);
      setTotalPages(1);
      setOpinions([]);
      await fetchOpinions(undefined, 0, false);
    } else {
      setSelectedStarsFilter(newFilter);
      setCurrentPage(0);
      setTotalPages(1);
      setOpinions([]);
      await fetchOpinions(stars, 0, false);
    }
  };

  const handleCloseOpinionsModal = () => {
    setShowOpinionsModal(false);
    setOpinions([]);
    setErrorOpinions(null);
    setSelectedStarsFilter(null);
    setCurrentPage(0);
    setTotalPages(1);
  };

  // Infinite scroll obsługa
  const handleOpinionsScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      !loadingNextPage &&
      !loadingOpinions &&
      currentPage + 1 < totalPages &&
      el.scrollHeight - el.scrollTop - el.clientHeight < 40
    ) {
      await fetchOpinions(selectedStarsFilter?.stars ?? undefined, currentPage + 1, true);
    }
  };

  const containerPadding = isMobile ? '16px 0' : '40px 0';
  const computedSectionWidth = isMobile ? '100%' : sectionWidth;
  const headerGap = isMobile ? 12 : 24;
  const headerMarginTop = isMobile ? 12 : 20;
  const headerMarginBottom = isMobile ? 20 : 32;
  const avatarSize = isMobile ? 80 : 100;
  const cardPadding = isMobile ? 16 : 20;
  const addressPadding = isMobile ? 12 : 16;

  return (
    <div style={{ minHeight: 'calc(100vh - 160px)', backgroundColor: '#f7fafc', padding: containerPadding, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: headerGap, marginTop: headerMarginTop, marginBottom: headerMarginBottom, width: '100%', maxWidth: isMobile ? '100%' : computedSectionWidth }}>
        {/* LOGO */}
        <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {userData.logoUrl ? (
            <Image src={getImageUrl(userData.logoUrl)} alt="logo" width={avatarSize} height={avatarSize} style={{ objectFit: 'cover' }} />
          ) : (
            <span>LOGO</span>
          )}
        </div>
        {/* NAZWA + GWIAZDKI */}
        <div style={{ minWidth: isMobile ? 'auto' : 220, maxWidth: isMobile ? '100%' : 220, width: isMobile ? '100%' : 220, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: cardPadding, display: 'flex', flexDirection: 'column', justifyContent: 'center', wordBreak: 'break-word', whiteSpace: 'normal' }}>
          <div style={{ fontWeight: 'bold', fontSize: 22 }}>{userData.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {renderInteractiveStars(rate.rate, handleStarClick, handleStarHover, handleStarLeave)}
            </div>
            <span
              style={{ fontSize: 14, color: '#888', marginLeft: 4, cursor: 'pointer', textDecoration: 'underline' }}
              onClick={handleOpenOpinionsModal}
            >
              {rate.count === 0 ? 'brak opinii' : `${rate.count} opinii`}
            </span>
          </div>
        </div>
        {/* MAPA GOOGLE */}
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', display: isMobile ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GoogleMapComponent userLocation={{ lat: userData.lat, lon: userData.lon }} offers={[]} />
        </div>
        {/* ADRES */}
        <div style={{ minWidth: isMobile ? 'auto' : 220, maxWidth: isMobile ? '100%' : 220, width: isMobile ? '100%' : 220, minHeight: 60, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', fontWeight: 'bold', fontSize: 15, padding: addressPadding, wordBreak: 'break-word', whiteSpace: 'normal' }}>
          <span style={{ fontWeight: 400, color: '#888', fontSize: 14, marginBottom: 2 }}>Adres:</span>
          <span>{userData.location || 'ADRES'}</span>
        </div>
      </div>
      {/* OPIS */}
      {userData.description && (
        <div style={{ width: computedSectionWidth, minHeight: 80, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: isMobile ? 20 : 32, padding: isMobile ? 16 : 24, fontSize: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>OPIS</div>
          <div>{userData.description}</div>
        </div>
      )}
      {/* OGŁOSZENIA */}
      <div style={{ width: computedSectionWidth, minHeight: 300, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: isMobile ? 16 : 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 'bold' }}>OGŁOSZENIA</span>
          {!isMobile && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setView('tiles')} style={{ padding: 8, borderRadius: 8, border: view === 'tiles' ? '2px solid #fbbf24' : '1px solid #e2e8f0', background: view === 'tiles' ? '#f7fafc' : '#fff', color: view === 'tiles' ? '#fbbf24' : '#2d3748', fontWeight: view === 'tiles' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Widok kafelków">
                <FaTableCells size={22} />
              </button>
              <button onClick={() => setView('list')} style={{ padding: 8, borderRadius: 8, border: view === 'list' ? '2px solid #fbbf24' : '1px solid #e2e8f0', background: view === 'list' ? '#f7fafc' : '#fff', color: view === 'list' ? '#fbbf24' : '#2d3748', fontWeight: view === 'list' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Widok listy">
                <FaListUl size={22} />
              </button>
            </div>
          )}
        </div>
        {offers && offers.length > 0 ? (
          view === 'tiles' ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? 12 : 18 }}>
              {offers.map((offer) => (
                <OfferTile
                  key={offer.id}
                  {...offer}
                  width={isMobile ? 160 : tileWidth}
                  height={isMobile ? 200 : tileHeight}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {offers.map((offer) => (
                <Link 
                  key={offer.id} 
                  href={`/offers/${offer.id}/${encodeURIComponent(offer.name)}`} 
                  style={{ textDecoration: 'none', color: 'inherit' }}
                  onClick={() => trackOfferClick(offer.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f7fafc', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 12, gap: 18, cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                    <div style={{ width: 90, height: 60, borderRadius: 8, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image src={getImageUrl(offer.imageUrl)} alt={offer.name} width={90} height={60} style={{ objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 16 }}>{offer.name}</div>
                      <div style={{ color: '#666', fontSize: 14 }}>{offer.location}</div>
                      <div style={{ color: '#888', fontSize: 13 }}>{offer.transactionType === 'free' ? 'Za darmo' : offer.transactionType === 'sale' ? 'Na sprzedaż' : 'Wymiana'}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : <div>Brak ogłoszeń.</div>}
      </div>

      {/* Modal wystawiania opinii */}
      {showRatingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {/* Nagłówek */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#2d3748',
                margin: 0
              }}>
                Wystaw opinię
              </h2>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#888',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Ocena czystości */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#2d3748',
                marginBottom: '12px'
              }}>
                Czystość:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {renderInteractiveStars(
                  hoveredRatings.cleanliness > 0 ? hoveredRatings.cleanliness : selectedRatings.cleanliness,
                  (rating) => handleModalStarClick('cleanliness', rating),
                  (rating) => handleModalStarHover('cleanliness', rating),
                  () => handleModalStarLeave('cleanliness')
                )}
              </div>
            </div>

            {/* Ocena jakości */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#2d3748',
                marginBottom: '12px'
              }}>
                Jakość:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {renderInteractiveStars(
                  hoveredRatings.quality > 0 ? hoveredRatings.quality : selectedRatings.quality,
                  (rating) => handleModalStarClick('quality', rating),
                  (rating) => handleModalStarHover('quality', rating),
                  () => handleModalStarLeave('quality')
                )}
              </div>
            </div>

            {/* Ocena transakcji */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#2d3748',
                marginBottom: '12px'
              }}>
                Ocena transakcji:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {renderInteractiveStars(
                  hoveredRatings.transactionRating > 0 ? hoveredRatings.transactionRating : selectedRatings.transactionRating,
                  (rating) => handleModalStarClick('transactionRating', rating),
                  (rating) => handleModalStarHover('transactionRating', rating),
                  () => handleModalStarLeave('transactionRating')
                )}
              </div>
            </div>

            {/* Komentarz */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#2d3748',
                marginBottom: '12px'
              }}>
                Komentarz (opcjonalny):
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Napisz swoją opinię..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
                maxLength={255}
                onFocus={(e) => e.target.style.borderColor = '#fbbf24'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <div style={{
                fontSize: '12px',
                color: '#888',
                textAlign: 'right',
                marginTop: '4px'
              }}>
                {comment.length}/255 znaków
              </div>
            </div>

            {/* Przyciski */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                Anuluj
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={selectedRatings.cleanliness === 0 || selectedRatings.quality === 0 || selectedRatings.transactionRating === 0 || isSubmitting}
                style={{
                  padding: '12px 24px',
                  backgroundColor: (selectedRatings.cleanliness === 0 || selectedRatings.quality === 0 || selectedRatings.transactionRating === 0) ? '#cbd5e0' : '#fbbf24',
                  color: (selectedRatings.cleanliness === 0 || selectedRatings.quality === 0 || selectedRatings.transactionRating === 0) ? '#888' : '#1a202c',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: (selectedRatings.cleanliness === 0 || selectedRatings.quality === 0 || selectedRatings.transactionRating === 0) || isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                {isSubmitting ? 'Wysyłanie...' : 'Wystaw opinię'}
              </button>
            </div>
            <div style={{
              fontSize: '13px',
              color: '#dc2626',
              marginTop: '24px',
              textAlign: 'center',
              fontWeight: 500
            }}>
              To funkcjonalność testowa. Docelowo ocenę będzie można wystawić tylko po skorzystaniu z oferty.
            </div>
          </div>
        </div>
      )}

      {/* Modal z opiniami */}
      {showOpinionsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={handleCloseOpinionsModal}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: isMobile ? 0 : '16px',
            padding: isMobile ? '16px' : '32px',
            maxWidth: isMobile ? '100%' : '700px',
            width: isMobile ? '100%' : '90%',
            maxHeight: isMobile ? '100vh' : '90vh',
            height: isMobile ? '100vh' : undefined,
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#2d3748', margin: 0 }}>Opinie klientów</h2>
              <button
                onClick={handleCloseOpinionsModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#888',
                  padding: '4px'
                }}
              >×</button>
            </div>
            {/* Statystyki gwiazdek - 3 kolumny */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
              {/* Nagłówki kolumn */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '0 8px' }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', fontSize: isMobile ? 11 : 12, fontWeight: 'bold', color: '#666' }}>
                  <div style={{ width: 'fit-content' }}>Czystość</div>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', fontSize: isMobile ? 11 : 12, fontWeight: 'bold', color: '#666' }}>
                  <div style={{ width: 'fit-content' }}>Jakość</div>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', fontSize: isMobile ? 11 : 12, fontWeight: 'bold', color: '#666' }}>
                  <div style={{ width: 'fit-content' }}>Transakcja</div>
                </div>
              </div>
              {[5,4,3,2,1].map(star => (
                <div
                  key={star}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 8,
                    padding: isMobile ? '0 4px' : '1px 6px',
                    transition: 'background 0.2s'
                  }}
                >
                  {/* Czystość */}
                  <div
                    onClick={() => handleFilterByStars('cleanliness', star)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: selectedStarsFilter?.category === 'cleanliness' && selectedStarsFilter?.stars === star ? '#fbbf24' : 'transparent',
                      borderRadius: 8,
                      padding: isMobile ? '0 6px' : '2px 8px',
                      transition: 'background 0.2s',
                      flex: 1
                    }}
                  >
                    <div style={{ display: 'flex', gap: isMobile ? 1 : 2 }}>
                      {Array.from({ length: star }).map((_, i) => (
                        <svg key={i} width={isMobile ? 12 : 16} height={isMobile ? 12 : 16} viewBox="0 0 24 24" fill="#fbbf24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                      {Array.from({ length: 5 - star }).map((_, i) => (
                        <svg key={i} width={isMobile ? 12 : 16} height={isMobile ? 12 : 16} viewBox="0 0 24 24" fill="#e2e8f0">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                    <span style={{ minWidth: isMobile ? 18 : 24, color: '#2d3748', fontWeight: 500, fontSize: isMobile ? 11 : 12 }}>
                      {star === 1 && starStats.cleanlinessOneStarCount}
                      {star === 2 && starStats.cleanlinessTwoStarCount}
                      {star === 3 && starStats.cleanlinessThreeStarCount}
                      {star === 4 && starStats.cleanlinessFourStarCount}
                      {star === 5 && starStats.cleanlinessFiveStarCount}
                    </span>
                  </div>

                  {/* Jakość */}
                  <div
                    onClick={() => handleFilterByStars('quality', star)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: selectedStarsFilter?.category === 'quality' && selectedStarsFilter?.stars === star ? '#fbbf24' : 'transparent',
                      borderRadius: 8,
                      padding: isMobile ? '0 6px' : '2px 8px',
                      transition: 'background 0.2s',
                      flex: 1
                    }}
                  >
                    <div style={{ display: 'flex', gap: isMobile ? 1 : 2 }}>
                      {Array.from({ length: star }).map((_, i) => (
                        <svg key={i} width={isMobile ? 12 : 16} height={isMobile ? 12 : 16} viewBox="0 0 24 24" fill="#fbbf24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                      {Array.from({ length: 5 - star }).map((_, i) => (
                        <svg key={i} width={isMobile ? 12 : 16} height={isMobile ? 12 : 16} viewBox="0 0 24 24" fill="#e2e8f0">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                    <span style={{ minWidth: isMobile ? 18 : 24, color: '#2d3748', fontWeight: 500, fontSize: isMobile ? 11 : 12 }}>
                      {star === 1 && starStats.qualityOneStarCount}
                      {star === 2 && starStats.qualityTwoStarCount}
                      {star === 3 && starStats.qualityThreeStarCount}
                      {star === 4 && starStats.qualityFourStarCount}
                      {star === 5 && starStats.qualityFiveStarCount}
                    </span>
                  </div>

                  {/* Transakcja */}
                  <div
                    onClick={() => handleFilterByStars('transactionRating', star)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: selectedStarsFilter?.category === 'transactionRating' && selectedStarsFilter?.stars === star ? '#fbbf24' : 'transparent',
                      borderRadius: 8,
                      padding: isMobile ? '0 6px' : '2px 8px',
                      transition: 'background 0.2s',
                      flex: 1
                    }}
                  >
                    <div style={{ display: 'flex', gap: isMobile ? 1 : 2 }}>
                      {Array.from({ length: star }).map((_, i) => (
                        <svg key={i} width={isMobile ? 12 : 16} height={isMobile ? 12 : 16} viewBox="0 0 24 24" fill="#fbbf24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                      {Array.from({ length: 5 - star }).map((_, i) => (
                        <svg key={i} width={isMobile ? 12 : 16} height={isMobile ? 12 : 16} viewBox="0 0 24 24" fill="#e2e8f0">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                    <span style={{ minWidth: isMobile ? 18 : 24, color: '#2d3748', fontWeight: 500, fontSize: isMobile ? 11 : 12 }}>
                      {star === 1 && starStats.transactionOneStarCount}
                      {star === 2 && starStats.transactionTwoStarCount}
                      {star === 3 && starStats.transactionThreeStarCount}
                      {star === 4 && starStats.transactionFourStarCount}
                      {star === 5 && starStats.transactionFiveStarCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Opinie */}
            <div
              style={{ flex: 1, overflowY: 'auto', minHeight: 100 }}
              onScroll={handleOpinionsScroll}
            >
              {loadingOpinions && <div style={{ textAlign: 'center', color: '#888', margin: '32px 0' }}>Ładowanie opinii...</div>}
              {errorOpinions && <div style={{ textAlign: 'center', color: '#dc2626', margin: '32px 0' }}>{errorOpinions}</div>}
              {!loadingOpinions && !errorOpinions && opinions.length === 0 && (
                <div style={{ textAlign: 'center', color: '#888', margin: '32px 0' }}>Brak opinii.</div>
              )}
              {!loadingOpinions && !errorOpinions && opinions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {opinions.map((op, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 16, background: '#f7fafc', borderRadius: 10, padding: 16, flexDirection: isMobile ? 'column' : 'row' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: isMobile ? 'auto' : 200, width: isMobile ? '100%' : undefined }}>
                        <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>
                          {new Date(op.createdAt).toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#666', minWidth: isMobile ? 60 : 70 }}>Czystość:</span>
                          {renderStars(op.cleanliness)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#666', minWidth: isMobile ? 60 : 70 }}>Jakość:</span>
                          {renderStars(op.quality)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#666', minWidth: isMobile ? 60 : 70 }}>Transakcja:</span>
                          {renderStars(op.transactionRating)}
                        </div>
                      </div>
                      <div style={{ flex: 1, color: '#2d3748', fontSize: 15, wordBreak: 'break-word', paddingTop: 8, width: isMobile ? '100%' : undefined }}>
                        {op.comment || <span style={{ color: '#bbb', fontStyle: 'italic' }}>[brak komentarza]</span>}
                      </div>
                    </div>
                  ))}
                  {loadingNextPage && <div style={{ textAlign: 'center', color: '#888', margin: '16px 0' }}>Ładowanie kolejnych opinii...</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 