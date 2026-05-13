"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaBell, FaSearch } from 'react-icons/fa';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { environment } from '../config';
import { authorizedFetch, isAuthenticated } from '../utils/auth';
import { useWebSocketContext } from '../context/WebSocketContext';
import { Message } from '../hooks/useGlobalWebSocket';

// Typ powiadomienia o nieprzeczytanej wiadomości
interface UnreadChatNotification {
  userId: number;
  senderName: string;
}

export default function MobileHeader() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadChats, setUnreadChats] = useState<UnreadChatNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const wsCtx = useWebSocketContext();

  // Sprawdź status logowania
  useEffect(() => {
    const checkAuthStatus = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
    };

    checkAuthStatus();
  }, []);

  // Pobierz powiadomienia z endpointa po zalogowaniu
  useEffect(() => {
    if (wsCtx.userId) {
      authorizedFetch(`${environment.apiUrl}/api/chats/unread`, { cache: 'no-store' })
        .then(res => res.json())
        .then((data: UnreadChatNotification[]) => {
          if (Array.isArray(data)) {
            setUnreadChats(prev => {
              // Dodaj tylko te powiadomienia, których jeszcze nie ma
              const existingIds = new Set(prev.map(c => c.userId));
              const newNotifs = data.filter((c: UnreadChatNotification) => !existingIds.has(c.userId));
              return [...prev, ...newNotifs];
            });
          }
        });
    }
  }, [wsCtx.userId]);

  // Dynamiczne powiadomienia przez WebSocket
  useEffect(() => {
    if (wsCtx.setGlobalMessageHandler) {
      wsCtx.setGlobalMessageHandler((msg: Message) => {
        // Obsługuj tylko wiadomości ze zwykłych czatów (REGULAR)
        // Ignoruj wiadomości z czatów z konsultantem (CONSULTANT) lub powiadomienia (mają pole 'type')
        if (msg.type) {
          return; // To jest powiadomienie, nie wiadomość - ignoruj
        }
        
        if (msg.chatType && msg.chatType !== "REGULAR") {
          return; // Ignoruj wiadomości z czatów z konsultantem
        }
        
        const isOnChatsPage = window.location.pathname === '/chats';
        const currentSelectedChatId = localStorage.getItem('currentSelectedChatId');
        const shouldAddNotification = !isOnChatsPage || (isOnChatsPage && currentSelectedChatId && currentSelectedChatId !== msg.chatId?.toString());
        if (shouldAddNotification) {
          setUnreadChats(prev => {
            if (prev.some(c => c.userId === msg.senderId)) return prev;
            try {
              const audio = new Audio('/sounds/notification.mp3');
              audio.volume = 0.5;
              audio.play().catch(err => console.log('Błąd odtwarzania dźwięku:', err));
            } catch (err) {
              console.log('Błąd tworzenia audio:', err);
            }
            return [
              ...prev,
              { userId: msg.senderId, senderName: msg.senderName }
            ];
          });
        }
      });
    }
    return () => {
      if (wsCtx.setGlobalMessageHandler) {
        wsCtx.setGlobalMessageHandler(null);
      }
    };
  }, [wsCtx]);

  const handleNotifications = () => {
    setShowNotifications(v => !v);
  };

  const handleSearchOffers = () => {
    router.push('/offers/search');
  };

  // Zamknij powiadomienia gdy kliknięto poza nimi
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      if (!target.closest('.mobile-notifications-container')) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <div className="mobile-header">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="cursor-pointer">
          <Image 
            src="/images/logo.png" 
            alt="GivenGet Logo" 
            width={100}
            height={100}
            className="h-12 w-auto"
          />
        </Link>
        {isLoggedIn && (
          <div style={{ position: 'relative' }} className="mobile-notifications-container">
            <button
              onClick={handleNotifications}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              style={{ position: 'relative' }}
            >
              <FaBell size={16} className="text-white" />
              {unreadChats.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: '#fde047',
                  color: '#23272f',
                  borderRadius: '50%',
                  minWidth: 16,
                  height: 16,
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  zIndex: 2
                }}>{unreadChats.length}</span>
              )}
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: 44,
                right: 0,
                background: '#f7fafc',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                minWidth: 280,
                maxWidth: 320,
                zIndex: 1000,
                border: 'none',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                {unreadChats.length === 0 ? (
                  <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px 0', fontSize: 14 }}>
                    Brak nowych powiadomień
                  </div>
                ) : (
                  unreadChats.map(chat => (
                    <div
                      key={chat.userId}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        background: '#e5e7eb',
                        fontSize: 13,
                        color: '#23272f',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'background 0.2s',
                        minHeight: 32
                      }}
                      onClick={() => {
                        setShowNotifications(false);
                        setUnreadChats(prev => prev.filter((c: UnreadChatNotification) => c.userId !== chat.userId));
                        // Wyślij request mark-read do backendu
                        authorizedFetch(`${environment.apiUrl}/api/chats/${chat.userId}/mark-read`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        router.push(`/chats?userId=${chat.userId}`);
                      }}
                      onTouchStart={e => (e.currentTarget.style.background = '#d1d5db')}
                      onTouchEnd={e => (e.currentTarget.style.background = '#e5e7eb')}
                    >
                      <span style={{
                        fontWeight: 600,
                        color: '#23272f',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%'
                      }}>
                        Masz nieprzeczytaną wiadomość od: {chat.senderName}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Search bar */}
      <div className="mobile-search-bar">
        <input
          type="text"
          placeholder="Czego szukasz?"
          className="mobile-search-input"
          onClick={handleSearchOffers}
          readOnly
        />
        <FaSearch 
          className="mobile-search-icon" 
          size={16} 
        />
      </div>
    </div>
  );
}
