"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TbDotsVertical } from "react-icons/tb";
import { environment } from '../../../config';
import { authorizedFetch, getUserData, isAuthenticated } from '../../../utils/auth';
import { useRouter } from 'next/navigation';

type ComplaintType = 'CHAT' | 'OFFER';

interface ComplaintDto {
  id: number;
  type: ComplaintType;
  explanation: string;
  reporterId: number | null;
  reporterUserName: string | null;
  reportedUserId: number | null;
  reportedUserName: string | null;
  chatId: number | null;
  messageId: number | null;
  offerId: string | null;
  resolved: boolean;
  createdAt: string; // ISO
  notesCount: number;
}

interface ComplaintNote {
  id: number;
  complaintId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function ComplaintsPage() {
  const router = useRouter();
  const [data, setData] = useState<ComplaintDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Chat snippet modal state
  interface ChatMessageDto {
    id: number;
    chatId: number;
    senderId: number;
    senderName: string;
    content: string;
    timestamp: string;
    messageType: string;
  }

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatSnippet, setChatSnippet] = useState<ChatMessageDto[] | null>(null);
  const [chatSnippetLoading, setChatSnippetLoading] = useState(false);
  const [chatSnippetError, setChatSnippetError] = useState<string | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<number | null>(null);

  // Row action menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId !== null) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleMenuToggle = (complaintId: number) => {
    if (openMenuId === complaintId) {
      setOpenMenuId(null);
      return;
    }
    
    setOpenMenuId(complaintId);
    
    // Dla dwóch ostatnich wierszy pokaż menu powyżej, inaczej poniżej
    const currentIndex = sortedData.findIndex(c => c.id === complaintId);
    const isLastTwo = currentIndex >= sortedData.length - 2;
    setMenuPosition(isLastTwo ? 'top' : 'bottom');
  };

  // Ban modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banReasonCode, setBanReasonCode] = useState<number | null>(null);
  const [banDurationDays, setBanDurationDays] = useState<number | null>(null);
  const [banningUserId, setBanningUserId] = useState<number | null>(null);
  const [selectedReported, setSelectedReported] = useState<{ id: number; name?: string } | null>(null);
  const [userRole, setUserRole] = useState<'ADMIN' | 'EMPLOYEE' | null>(null);
  
  // Kody powodów banowania
  const banReasonCodes = [
    { code: 101, label: 'Nieodpowiednia kategoria' },
    { code: 102, label: 'Wulgaryzmy/obraźliwe treści' },
    { code: 103, label: 'Towar niedozwolony' },
    { code: 104, label: 'Wprowadzające w błąd' },
    { code: 105, label: 'Naruszenie zdjęć/RODO' },
    { code: 201, label: 'Spam' },
    { code: 301, label: 'Nadużycie w transakcji' },
    { code: 401, label: 'Inne' },
  ];

  // Delete offer modal state
  const [showDeleteOfferModal, setShowDeleteOfferModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<{ id: string } | null>(null);

  // Block offer modal state
  const [showBlockOfferModal, setShowBlockOfferModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockingOfferId, setBlockingOfferId] = useState<string | null>(null);
  const [selectedBlockOffer, setSelectedBlockOffer] = useState<{ id: string } | null>(null);

  // Note modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [selectedComplaintForNote, setSelectedComplaintForNote] = useState<number | null>(null);
  const [notes, setNotes] = useState<ComplaintNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Filtry
  const [resolved, setResolved] = useState<string>(''); // '', 'true', 'false'
  const [type, setType] = useState<string>(''); // '', 'CHAT', 'OFFER'

  // Autoryzacja (moderator/admin)
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    const user = getUserData();
    if (!user || (user.userType !== 'ADMIN' && user.userType !== 'EMPLOYEE')) {
      router.push('/unauthorized');
      return;
    }
    if (user.userType === 'ADMIN' || user.userType === 'EMPLOYEE') {
      setUserRole(user.userType);
    }
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildUrl = () => {
    const url = new URL(`${environment.apiUrl}/api/mod/complaints`);
    if (resolved === 'true' || resolved === 'false') {
      url.searchParams.set('resolved', resolved);
    }
    if (type === 'CHAT' || type === 'OFFER') {
      url.searchParams.set('type', type);
    }
    return url.toString();
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authorizedFetch(buildUrl());
      if (response.ok) {
        const json = await response.json();
        setData(json as ComplaintDto[]);
      } else {
        const text = await response.text();
        setError(`Błąd pobierania: ${text}`);
      }
    } catch {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const filteredInfo = useMemo(() => {
    const chips: string[] = [];
    if (resolved === 'true') chips.push('Rozwiązane');
    if (resolved === 'false') chips.push('Nierozwiązane');
    if (type === 'CHAT') chips.push('Typ: czat');
    if (type === 'OFFER') chips.push('Typ: oferta');
    return chips;
  }, [resolved, type]);

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    });
    return copy;
  }, [data, sortDirection]);

  const openChatSnippet = async (chatId?: number | null, messageId?: number | null) => {
    if (!chatId || !messageId) return;
    setIsChatModalOpen(true);
    setChatSnippet(null);
    setChatSnippetError(null);
    setChatSnippetLoading(true);
    setHighlightMessageId(messageId);
    try {
      const url = `${environment.apiUrl}/api/mod/chats/${chatId}/messages/snippet?messageId=${messageId}`;
      const resp = await authorizedFetch(url);
      if (resp.ok) {
        const json = await resp.json();
        setChatSnippet(json as ChatMessageDto[]);
      } else {
        const text = await resp.text();
        setChatSnippetError(`Błąd pobierania fragmentu czatu: ${text}`);
      }
    } catch {
      setChatSnippetError('Błąd połączenia z serwerem');
    } finally {
      setChatSnippetLoading(false);
    }
  };

  // Funkcje do obsługi notatek
  const openNoteModal = async (complaintId: number) => {
    setSelectedComplaintForNote(complaintId);
    setNoteContent('');
    setNotes([]);
    setShowNoteModal(true);
    setOpenMenuId(null);
    
    // Pobierz istniejące notatki
    await fetchNotes(complaintId);
  };

  const fetchNotes = async (complaintId: number) => {
    try {
      setLoadingNotes(true);
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/mod/complaints/${complaintId}/notes`
      );
      if (response.ok) {
        const json = await response.json();
        setNotes(json as ComplaintNote[]);
      } else {
        console.error('Błąd pobierania notatek:', await response.text());
      }
    } catch (error) {
      console.error('Błąd połączenia podczas pobierania notatek:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedComplaintForNote) return;
    
    if (!noteContent.trim()) {
      alert('Treść notatki nie może być pusta');
      return;
    }
    
    try {
      setAddingNote(true);
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/mod/complaints/${selectedComplaintForNote}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: noteContent.trim() }),
        }
      );
      
      if (response.ok) {
        const newNote = await response.json();
        setNotes([...notes, newNote as ComplaintNote]);
        setNoteContent('');
        // Odśwież listę skarg, aby zaktualizować notesCount
        await fetchComplaints();
      } else {
        const errorText = await response.text();
        alert(`Błąd dodawania notatki: ${errorText}`);
      }
    } catch (error) {
      console.error('Błąd połączenia podczas dodawania notatki:', error);
      alert('Błąd połączenia z serwerem');
    } finally {
      setAddingNote(false);
    }
  };

  const handleConfirmBan = async () => {
    if (!selectedReported) return;
    
    // Walidacja
    if (!banReasonCode) {
      alert('Proszę wybrać kod powodu bana');
      return;
    }
    
    if (banReasonCode === 401 && !banReason.trim()) {
      alert('Powód "Inne" wymaga dodatkowego opisu');
      return;
    }
    
    if (userRole === 'EMPLOYEE' && (!banDurationDays || banDurationDays <= 0)) {
      alert('Moderator musi podać czas trwania bana (liczba dni). Ban permanentny jest dostępny tylko dla administratorów.');
      return;
    }
    
    try {
      setBanningUserId(selectedReported.id);
      
      const url = new URL(`${environment.apiUrl}/api/mod/users/${selectedReported.id}/ban`);
      url.searchParams.set('banned', 'true');
      url.searchParams.set('reasonCode', banReasonCode.toString());
      
      if (banReason.trim()) {
        url.searchParams.set('reason', banReason.trim());
      }
      
      if (banDurationDays !== null && banDurationDays > 0) {
        url.searchParams.set('durationDays', banDurationDays.toString());
      }
      // Dla admina, jeśli durationDays jest null, ban jest permanentny (nie dodajemy parametru)
      
      const resp = await authorizedFetch(url.toString(), { method: 'PATCH' });
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Błąd banowania użytkownika', errorText);
        alert(`Błąd: ${errorText}`);
      } else {
        // Odśwież listę skarg
        fetchComplaints();
      }
    } catch (err) {
      console.error('Błąd połączenia podczas banowania', err);
      alert('Błąd połączenia z serwerem');
    } finally {
      setBanningUserId(null);
      setShowBanModal(false);
      setBanReason('');
      setBanReasonCode(null);
      setBanDurationDays(null);
      setSelectedReported(null);
    }
  };

  const handleConfirmDeleteOffer = async () => {
    if (!selectedOffer) return;
    try {
      setDeletingOfferId(selectedOffer.id);
      const url = `${environment.apiUrl}/api/admin/offers/${selectedOffer.id}?reason=${encodeURIComponent(deleteReason)}`;
      const resp = await authorizedFetch(url, { method: 'DELETE' });
      if (!resp.ok) {
        console.error('Błąd usuwania oferty', await resp.text());
      }
    } catch (err) {
      console.error('Błąd połączenia podczas usuwania oferty', err);
    } finally {
      setDeletingOfferId(null);
      setShowDeleteOfferModal(false);
      setDeleteReason('');
      setSelectedOffer(null);
    }
  };

  const handleConfirmBlockOffer = async () => {
    if (!selectedBlockOffer) return;
    try {
      setBlockingOfferId(selectedBlockOffer.id);
      const url = `${environment.apiUrl}/api/mod/offers/${selectedBlockOffer.id}/block?reason=${encodeURIComponent(blockReason)}`;
      const resp = await authorizedFetch(url, { method: 'PATCH' });
      if (!resp.ok) {
        console.error('Błąd blokowania oferty', await resp.text());
      }
    } catch (err) {
      console.error('Błąd połączenia podczas blokowania oferty', err);
    } finally {
      setBlockingOfferId(null);
      setShowBlockOfferModal(false);
      setBlockReason('');
      setSelectedBlockOffer(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Skargi</h1>
            <p className="text-gray-600 mt-2">Przeglądaj i filtruj zgłoszone skargi</p>
          </div>
          <button
            onClick={fetchComplaints}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Odśwież
          </button>
        </div>
      </div>

      {/* Filtry */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={resolved}
              onChange={(e) => setResolved(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wszystkie</option>
              <option value="false">Nierozwiązane</option>
              <option value="true">Rozwiązane</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wszystkie</option>
              <option value="CHAT">Czat</option>
              <option value="OFFER">Oferta</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchComplaints}
              className="w-full md:w-auto bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-black transition-colors"
            >
              Zastosuj filtry
            </button>
          </div>
        </div>
        {filteredInfo.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {filteredInfo.map((c) => (
              <span key={c} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Lista skarg */}
      {loading ? (
        <div className="text-center py-16 text-gray-600">Ładowanie skarg...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">{error}</div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Brak skarg do wyświetlenia</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zgłaszający</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Na kogo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dotyczy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    title="Kliknij, aby zmienić kolejność sortowania"
                  >
                    <div className="flex items-center gap-1">
                      Data
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notatki</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcja</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{c.id}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${c.type === 'CHAT' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {c.type === 'CHAT' ? 'Czat' : 'Oferta'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[360px] truncate" title={c.explanation}>{c.explanation}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {(() => {
                        const id = c.reporterId;
                        const name = c.reporterUserName || undefined;
                        if (!id && !name) return '-';
                        const label = name || `Użytkownik ${id}`;
                        return id ? (
                          <a
                            href={`/profile/${id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            title={name ? `${name} (ID: ${id})` : `ID: ${id}`}
                          >
                            {label}
                          </a>
                        ) : (
                          <span>{label}</span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {(() => {
                        const id = c.reportedUserId;
                        const name = c.reportedUserName || undefined;
                        if (!id && !name) return '-';
                        const label = name || `Użytkownik ${id}`;
                        return id ? (
                          <a
                            href={`/profile/${id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            title={name ? `${name} (ID: ${id})` : `ID: ${id}`}
                          >
                            {label}
                          </a>
                        ) : (
                          <span>{label}</span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {c.type === 'OFFER' && c.offerId ? (
                        <a
                          href={`/offers/${c.offerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                        >
                          Zobacz ofertę
                        </a>
                      ) : c.type === 'CHAT' && c.chatId ? (
                        <button
                          type="button"
                          onClick={() => openChatSnippet(c.chatId!, c.messageId!)}
                          disabled={!c.messageId}
                          className="inline-flex items-center px-3 py-1.5 rounded bg-gray-800 text-white text-xs hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Zobacz czat
                        </button>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${c.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {c.resolved ? 'Rozwiązana' : 'Nierozwiązana'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      {c.notesCount > 0 ? (
                        <button
                          onClick={() => openNoteModal(c.id)}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer transition-colors"
                          title="Kliknij, aby zobaczyć notatki"
                        >
                          📝 {c.notesCount}
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          📝 {c.notesCount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => handleMenuToggle(c.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <TbDotsVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === c.id && (
                          <div className={`absolute right-0 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20 ${
                            menuPosition === 'top' ? 'mb-2 bottom-full' : 'mt-2 top-full'
                          }`}>
                            <div className="py-1">
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openNoteModal(c.id);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                              >
                                <span className="mr-2">📝</span>
                                Dodaj notatkę
                              </button>
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (c.reportedUserId) {
                                    setSelectedReported({ id: c.reportedUserId, name: c.reportedUserName || undefined });
                                    setBanReason('');
                                    setBanReasonCode(null);
                                    // Dla moderatorów domyślnie ustaw ban czasowy na 7 dni
                                    // Dla adminów domyślnie null (możliwość wyboru permanentnego)
                                    setBanDurationDays(userRole === 'EMPLOYEE' ? 7 : null);
                                    setShowBanModal(true);
                                    setOpenMenuId(null);
                                  }
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!c.reportedUserId}
                              >
                                <span className="mr-2">🚫</span>
                                Zbanuj oskarżonego
                              </button>
                              <button
                                onMouseDown={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    const url = `${environment.apiUrl}/api/mod/complaints/${c.id}/resolve?resolved=${!c.resolved}`;
                                    const resp = await authorizedFetch(url, { method: 'PATCH' });
                                    if (resp.ok) {
                                      // Zaktualizuj lokalnie status skargi
                                      setData(prev => prev.map(x => x.id === c.id ? { ...x, resolved: !c.resolved } : x));
                                    } else {
                                      // opcjonalnie: pokaż komunikat błędu
                                      console.error('Błąd aktualizacji skargi', await resp.text());
                                    }
                                  } catch (err) {
                                    console.error('Błąd połączenia', err);
                                  } finally {
                                    setOpenMenuId(null);
                                  }
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <span className="mr-2">✔️</span>
                                {c.resolved ? 'Otwórz skargę' : 'Rozwiąż skargę'}
                              </button>
                              {c.type === 'OFFER' && c.offerId && (
                                <>
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedBlockOffer({ id: c.offerId! });
                                      setShowBlockOfferModal(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors"
                                  >
                                    <span className="mr-2">🚫</span>
                                    Zablokuj ofertę
                                  </button>
                                  {getUserData()?.userType === 'ADMIN' && (
                                    <button
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedOffer({ id: c.offerId! });
                                        setShowDeleteOfferModal(true);
                                        setOpenMenuId(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                    >
                                      <span className="mr-2">🗑️</span>
                                      Usuń ofertę
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chat snippet modal */}
      {isChatModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Fragment czatu</h3>
              <button
                onClick={() => setIsChatModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-56px)]">
              {chatSnippetLoading ? (
                <div className="text-center py-12 text-gray-600">Ładowanie fragmentu...</div>
              ) : chatSnippetError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{chatSnippetError}</div>
              ) : chatSnippet && chatSnippet.length > 0 ? (
                <div className="space-y-2">
                  {chatSnippet.map((m) => {
                    const isHighlighted = m.id === highlightMessageId;
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded border ${isHighlighted ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}
                        title={new Date(m.timestamp).toLocaleString()}
                      >
                        <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                          <span className="font-medium text-gray-700">{m.senderName}</span>
                          <span>{new Date(m.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{m.content}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">Brak wiadomości do wyświetlenia</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ban modal */}
      {showBanModal && selectedReported && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Zbanuj użytkownika</h3>
              <button
                onClick={() => { 
                  setShowBanModal(false); 
                  setBanReason(''); 
                  setBanReasonCode(null);
                  setBanDurationDays(null);
                  setSelectedReported(null); 
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="text-sm text-gray-700">
                Oskarżony: <span className="font-medium">{selectedReported.name || `ID: ${selectedReported.id}`}</span>
              </div>
              
              {/* Kod powodu bana - wymagany */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kod powodu bana <span className="text-red-500">*</span>
                </label>
                <select
                  value={banReasonCode || ''}
                  onChange={(e) => {
                    const code = e.target.value ? parseInt(e.target.value) : null;
                    setBanReasonCode(code);
                    // Wyczyść reason jeśli zmieniono kod (oprócz 401)
                    if (code !== 401) {
                      setBanReason('');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Wybierz kod powodu --</option>
                  {banReasonCodes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} - {item.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Wybierz kod powodu bana zgodnie z regulaminem
                </p>
              </div>

              {/* Dodatkowy opis - wymagany dla kodu 401 */}
              {banReasonCode === 401 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Szczegółowy opis powodu <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Opisz szczegółowo powód bana..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Dla kodu &quot;Inne&quot; wymagany jest szczegółowy opis
                  </p>
                </div>
              )}

              {/* Dodatkowy opis - opcjonalny dla innych kodów */}
              {banReasonCode && banReasonCode !== 401 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dodatkowy opis (opcjonalnie)
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Dodatkowe informacje o powodzie bana..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Opcjonalny dodatkowy opis powodu bana
                  </p>
                </div>
              )}

              {/* Czas trwania bana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Czas trwania bana {userRole === 'EMPLOYEE' && <span className="text-red-500">*</span>}
                </label>
                {userRole === 'EMPLOYEE' ? (
                  // Dla moderatorów tylko ban czasowy
                  <div>
                    <input
                      type="number"
                      min="1"
                      value={banDurationDays || ''}
                      onChange={(e) => {
                        const days = e.target.value ? parseInt(e.target.value) : null;
                        setBanDurationDays(days);
                      }}
                      placeholder="Liczba dni"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Moderator musi podać czas trwania bana (minimum 1 dzień). Ban permanentny jest dostępny tylko dla administratorów.
                    </p>
                  </div>
                ) : (
                  // Dla administratorów wybór między czasowym a permanentnym
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="ban-temporary"
                        name="ban-duration"
                        checked={banDurationDays !== null}
                        onChange={() => setBanDurationDays(7)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="ban-temporary" className="text-sm text-gray-700">
                        Ban czasowy
                      </label>
                    </div>
                    {banDurationDays !== null && (
                      <div className="ml-6">
                        <input
                          type="number"
                          min="1"
                          value={banDurationDays || ''}
                          onChange={(e) => {
                            const days = e.target.value ? parseInt(e.target.value) : null;
                            setBanDurationDays(days);
                          }}
                          placeholder="Liczba dni"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Podaj liczbę dni trwania bana
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="ban-permanent"
                        name="ban-duration"
                        checked={banDurationDays === null}
                        onChange={() => setBanDurationDays(null)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="ban-permanent" className="text-sm text-gray-700">
                        Ban permanentny
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => { 
                  setShowBanModal(false); 
                  setBanReason(''); 
                  setBanReasonCode(null);
                  setBanDurationDays(null);
                  setSelectedReported(null); 
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmBan}
                disabled={banningUserId === selectedReported.id}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {banningUserId === selectedReported.id ? 'Przetwarzanie...' : 'Zbanuj'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete offer modal */}
      {showDeleteOfferModal && selectedOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Usuń ofertę</h3>
              <button
                onClick={() => { setShowDeleteOfferModal(false); setDeleteReason(''); setSelectedOffer(null); }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-700">
                Oferta: <span className="font-medium">{selectedOffer.id}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Powód usunięcia</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  placeholder="Naruszenie regulaminu platformy..."
                />
                <p className="text-xs text-gray-500 mt-1">Powód zostanie wysłany twórcy oferty w e-mailu.</p>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
              <button
                onClick={() => { setShowDeleteOfferModal(false); setDeleteReason(''); setSelectedOffer(null); }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmDeleteOffer}
                disabled={deletingOfferId === selectedOffer.id}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingOfferId === selectedOffer.id ? 'Usuwanie...' : 'Usuń ofertę'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block offer modal */}
      {showBlockOfferModal && selectedBlockOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Zablokuj ofertę</h3>
              <button
                onClick={() => { setShowBlockOfferModal(false); setBlockReason(''); setSelectedBlockOffer(null); }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-700">
                Oferta: <span className="font-medium">{selectedBlockOffer.id}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Powód blokowania</label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  placeholder="Naruszenie regulaminu - nieprawidłowa kategoria..."
                />
                <p className="text-xs text-gray-500 mt-1">Powód zostanie wysłany twórcy oferty w e-mailu.</p>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
              <button
                onClick={() => { setShowBlockOfferModal(false); setBlockReason(''); setSelectedBlockOffer(null); }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmBlockOffer}
                disabled={blockingOfferId === selectedBlockOffer.id}
                className="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {blockingOfferId === selectedBlockOffer.id ? 'Blokowanie...' : 'Zablokuj ofertę'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note modal */}
      {showNoteModal && selectedComplaintForNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Notatki do skargi #{selectedComplaintForNote}</h3>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteContent('');
                  setSelectedComplaintForNote(null);
                  setNotes([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Lista istniejących notatek */}
              {loadingNotes ? (
                <div className="text-center py-8 text-gray-600">Ładowanie notatek...</div>
              ) : notes.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Istniejące notatki:</h4>
                  {notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{note.authorName}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(note.createdAt).toLocaleString('pl-PL')}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Brak notatek dla tej skargi
                </div>
              )}

              {/* Formularz dodawania nowej notatki */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Dodaj nową notatkę:</h4>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Wprowadź treść notatki..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Notatki są wewnętrzne i widoczne tylko dla moderatorów i administratorów
                </p>
              </div>
            </div>
            
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteContent('');
                  setSelectedComplaintForNote(null);
                  setNotes([]);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Zamknij
              </button>
              <button
                onClick={handleAddNote}
                disabled={addingNote || !noteContent.trim()}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingNote ? 'Dodawanie...' : 'Dodaj notatkę'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


