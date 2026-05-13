"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getUserData, logout, addAuthChangeListener, removeAuthChangeListener, AuthTokenData, authorizedFetch } from '../utils/auth';
import Image from 'next/image';
import { FaMessage } from "react-icons/fa6";
import { IoMdNotificationsOutline } from "react-icons/io";
import { FaRegHeart } from "react-icons/fa6";
import { environment } from '../config';
import { useWebSocketContext } from '../context/WebSocketContext';

// Typy z czatów
interface Chat {
  id: number;
  avatarUrl: string;
  createdAt: string;
  otherParticipantId: number;
  otherParticipantName: string;
  lastMessagePreview: string;
  lastMessageTimestamp: string;
  unreadCount: number;
}

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  timestamp: string;
  messageType: string;
  type?: string;
  chatType?: "REGULAR" | "CONSULTANT"; // Opcjonalne dla kompatybilności wstecznej
}

// Typ powiadomienia o nieprzeczytanej wiadomości
interface UnreadChatNotification {
  userId: number;
  senderName: string;
}

export const Header: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<Partial<AuthTokenData> | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const [unreadChats, setUnreadChats] = useState<UnreadChatNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const wsCtx = useWebSocketContext();

  useEffect(() => {
    // Sprawdź status logowania po załadowaniu komponentu
    const checkAuthStatus = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      if (authenticated) {
        setUserData(getUserData());
      } else {
        setUserData(null);
      }
    };

    checkAuthStatus();

    // Dodaj listener do zmian stanu logowania
    addAuthChangeListener(checkAuthStatus);

    // Nasłuchuj zmian w localStorage (np. po zalogowaniu w innej karcie)
    const handleStorageChange = () => {
      checkAuthStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      removeAuthChangeListener(checkAuthStatus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Subskrybuj czaty po zalogowaniu
  useEffect(() => {
    if (wsCtx.userId) {
      authorizedFetch(`${environment.apiUrl}/api/chats/me`, { cache: 'no-store' })
        .then(res => res.json())
        .then((chats: Chat[]) => {
          if (Array.isArray(chats)) {
            wsCtx.subscribeToChats(chats.map((c: Chat) => c.id));
          }
        });
    }
    // tutaj może się wyjebać
  }, [wsCtx.userId]);

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
    });}
    return () => {
      if (wsCtx.setGlobalMessageHandler) {
        wsCtx.setGlobalMessageHandler(null);
      }
    };
  }, [wsCtx.setGlobalMessageHandler, pathname]);

  useEffect(() => {
    // Zamknij dropdown gdy kliknięto poza nim
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCartClick = () => {
    window.open('https://google.com', '_blank');
  };

  const handleFavoritesClick = () => {
    router.push('/favorites');
  };

  const handleProfileClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogin = () => {
    setShowDropdown(false);
    router.push('/login');
  };

  const handleRegister = () => {
    setShowDropdown(false);
    router.push('/register');
  };

  const handleViewProfile = () => {
    setShowDropdown(false);
    router.push('/profile'); // lub inna ścieżka do profilu
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUserData(null);
    setShowDropdown(false);
    router.push('/?message=logged-out');
  };

  return (
    <header style={{
      backgroundColor: '#2d3748',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
        {/* Logo po lewej */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            src="/images/logo.png"
            alt="GnG Logo"
            width={120}
            height={60}
            style={{ objectFit: 'contain' }}
          />
        </Link>

        {/* Przyciski po prawej */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
          {/* Przycisk powiadomień */}
          {isLoggedIn && (
            <div style={{ position: 'relative' }}>
              <button
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#4a5568',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.3s',
                  position: 'relative'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4a5568'}
                onClick={() => setShowNotifications(v => !v)}
              >
                <IoMdNotificationsOutline size={28} color="white" />
                {unreadChats.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: '#fde047',
                    color: '#23272f',
                    borderRadius: '50%',
                    minWidth: 18,
                    height: 18,
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                    zIndex: 2
                  }}>{unreadChats.length}</span>
                )}
              </button>
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: 56,
                  right: 0,
                  background: '#f7fafc',
                  borderRadius: 14,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  minWidth: 300,
                  zIndex: 1000,
                  border: 'none',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}>
                  {unreadChats.length === 0 ? (
                    <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px 0', fontSize: 15 }}>
                      Brak nowych powiadomień
                    </div>
                  ) : (
                    unreadChats.map(chat => (
                      <div
                        key={chat.userId}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          background: '#e5e7eb',
                          fontSize: 14,
                          color: '#23272f',
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          transition: 'background 0.2s',
                          minHeight: 36
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
                        onMouseOver={e => (e.currentTarget.style.background = '#d1d5db')}
                        onMouseOut={e => (e.currentTarget.style.background = '#e5e7eb')}
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
          {/* Przycisk ulubionych */}
          {isLoggedIn && (
            <button
              onClick={handleFavoritesClick}
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#4a5568',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4a5568'}
            >
              <FaRegHeart size={24} color="white" />
            </button>
          )}
          {/* Przycisk koszyka */}
          {isLoggedIn && (
            <button
              onClick={handleCartClick}
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#4a5568',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4a5568'}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V16.5M9 19.5C9.8 19.5 10.5 20.2 10.5 21S9.8 22.5 9 22.5 7.5 21.8 7.5 21 8.2 19.5 9 19.5ZM20 19.5C20.8 19.5 21.5 20.2 21.5 21S20.8 22.5 20 22.5 18.5 21.8 18.5 21 19.2 19.5 20 19.5Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* Kontener przycisku profilu z dropdown */}
          <div style={{ position: 'relative' }}>
            {/* Przycisk profilu */}
            <button
              ref={profileButtonRef}
              onClick={handleProfileClick}
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: showDropdown ? '#2d3748' : '#4a5568',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => {
                if (!showDropdown) {
                  e.currentTarget.style.backgroundColor = '#2d3748';
                }
              }}
              onMouseOut={(e) => {
                if (!showDropdown) {
                  e.currentTarget.style.backgroundColor = '#4a5568';
                }
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 21V19C20 17.9 19.1 17 18 17H6C4.9 17 4 17.9 4 19V21M16 7C16 9.2 14.2 11 12 11S8 9.2 8 7 9.8 3 12 3 16 4.8 16 7Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                style={{
                  position: 'absolute',
                  top: '56px',
                  right: '0',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  minWidth: '200px',
                  zIndex: 1000,
                  border: '1px solid #e2e8f0'
                }}
              >
                {isLoggedIn ? (
                  // Menu dla zalogowanego użytkownika
                  <>
                    {userData && (
                      <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: '#f7fafc'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#2d3748'
                        }}>
                          {userData.firstName} {userData.lastName}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#4a5568'
                        }}>
                          {userData.email}
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={handleViewProfile}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#2d3748',
                        borderBottom: '1px solid #e2e8f0',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      👤 Wyświetl profil
                    </button>

                    <button
                      onClick={() => { window.location.href = '/chats'; }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#2d3748',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FaMessage style={{ fontSize: '16px' }} />
                      Wiadomości
                      {unreadChats.length > 0 && (
                        <span style={{
                          color: '#dc2626',
                          fontWeight: 700,
                          marginLeft: 4,
                          display: 'inline-block',
                          lineHeight: 1,
                          verticalAlign: 'baseline'
                        }}>
                          ({unreadChats.length})
                        </span>
                      )}
                    </button>
                    
                    {/* Przycisk Panel administracyjny dla ról EMPLOYEE i ADMIN */}
                    {(userData?.userType === 'EMPLOYEE' || userData?.userType === 'ADMIN') && (
                      <button
                        onClick={() => { router.push('/admin'); setShowDropdown(false); }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#2d3748',
                          borderBottom: '1px solid #e2e8f0',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        ⚙️ Panel administracyjny
                      </button>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#dc2626',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      🚪 Wyloguj
                    </button>
                  </>
                ) : (
                  // Menu dla niezalogowanego użytkownika
                  <>
                    <button
                      onClick={handleLogin}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#2d3748',
                        borderBottom: '1px solid #e2e8f0',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      🔑 Zaloguj
                    </button>
                    
                    <button
                      onClick={handleRegister}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#2d3748',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      📝 Zarejestruj
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
  );
}; 