"use client";

import React, { useState, useEffect, useRef } from 'react';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';
import OfferTileList from './OfferTileList';
import { OfferTileProps, OfferStatus, STATUS_LABELS } from '../types/offer';
import { FaListUl, FaTableCells, FaFilter } from 'react-icons/fa6';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '../utils/imageUtils';

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

  // Funkcja do uzyskiwania kolorów dla statusu
  const getStatusColors = (status?: OfferStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'PENDING_VERIFICATION':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
      <div className="flex justify-center items-center p-10">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-10">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Nagłówek z przyciskami wyboru widoku */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Moje oferty</h1>
          <p className="text-gray-600 text-sm mt-1">Kliknij ofertę aby edytować</p>
        </div>
        {!isMobile && (
          <div className="flex gap-2">
            <button 
              onClick={() => setView('tiles')} 
              className={`p-2 rounded-lg border-2 transition-all ${
                view === 'tiles' 
                  ? 'border-yellow-400 bg-yellow-50 text-yellow-600' 
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
              aria-label="Widok kafelków"
            >
              <FaTableCells size={20} />
            </button>
            <button 
              onClick={() => setView('list')} 
              className={`p-2 rounded-lg border-2 transition-all ${
                view === 'list' 
                  ? 'border-yellow-400 bg-yellow-50 text-yellow-600' 
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
              aria-label="Widok listy"
            >
              <FaListUl size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Filtr statusu */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-gray-600" size={16} />
          <span className="text-sm font-medium text-gray-700">Filtruj według statusu:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 text-sm font-medium rounded-full border transition-all ${
              statusFilter === 'ALL'
                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Wszystkie ({offers.length})
          </button>
          {(['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION'] as const).map((status) => {
            const count = offers.filter(offer => offer.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-sm font-medium rounded-full border transition-all ${
                  statusFilter === status
                    ? `${getStatusColors(status)} border-current`
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {STATUS_LABELS[status]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Wyświetlanie ofert */}
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Nie masz jeszcze żadnych ofert</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Brak ofert z wybranym statusem</p>
        </div>
      ) : view === 'tiles' ? (
        <OfferTileList 
          offers={filteredOffers} 
          loading={false}
          emptyMessage=""
          tileWidth={200}
          tileHeight={220}
          imageWidth={160}
          imageHeight={100}
          isEditing={true}
        />
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer) => (
            <Link key={offer.id} href={`/offers/edit/${offer.id}`} className="block">
              <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-4 gap-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image 
                    src={getImageUrl(offer.imageUrl)} 
                    alt={offer.name} 
                    width={96} 
                    height={64} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-lg truncate">{offer.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{offer.location}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      offer.transactionType === 'free' 
                        ? 'bg-green-100 text-green-800' 
                        : offer.transactionType === 'sale' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {offer.transactionType === 'free' ? 'Za darmo' : 
                       offer.transactionType === 'sale' ? 'Na sprzedaż' : 'Wymiana'}
                    </span>
                    {offer.status && (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColors(offer.status)}`}>
                        {STATUS_LABELS[offer.status]}
                      </span>
                    )}
                    {offer.distance && (
                      <span className="text-blue-600 text-sm font-medium">({offer.distance})</span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-yellow-600 text-sm font-medium">Edytuj</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 