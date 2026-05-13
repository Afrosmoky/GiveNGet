"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { environment } from '../config';
import { authorizedFetch, getUserData } from '../utils/auth';
import UserRankBadge from './UserRankBadge';
import FreeOffersCounter from './FreeOffersCounter';

interface ActivitySummary {
  totalOffers: number;
  activeOffers: number;
  pendingOffers: number;
  expiredOffers: number;
  messagesFromUsers: number;
  totalViews: number;
}

interface DashboardData {
  activitySummary: ActivitySummary;
  popularityOverTime: Record<string, number>;
  ctrData: Record<string, {
    offerId: string;
    offerName: string;
    views: number;
    clicks: number;
    ctr: number;
  }>;
}

export function CompanyDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const fetchingUserDataRef = useRef(false);
  const [userInfo, setUserInfo] = useState<{
    userRank?: string;
    trustPoints?: number;
    freeOffersCount?: number;
  }>({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Zapobiegaj podwójnym zapytaniom
      if (fetchingRef.current) return;
      
      fetchingRef.current = true;
      try {
        setLoading(true);
        setError(null);
        
        console.log('Wysyłam request na:', `${environment.apiUrl}/api/company/dashboard-data`);
        
        const response = await authorizedFetch(`${environment.apiUrl}/api/company/dashboard-data`, {
          method: 'GET'
        });
        
        console.log('Odpowiedź:', response);
        console.log('Status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          setData(data);
        } else if (response.status === 401) {
          console.log('Brak autoryzacji - przekierowuję na /unauthorized');
          router.push('/unauthorized');
          return;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Błąd serwera:', errorData);
          setError(errorData.message || `Błąd serwera: ${response.status}`);
        }
        
      } catch (error) {
        console.error('Błąd połączenia:', error);
        setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.');
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchDashboardData();
    
    // Pobierz dane użytkownika z endpointu
    const fetchUserData = async () => {
      // Zapobiegaj podwójnym zapytaniom
      if (fetchingUserDataRef.current) return;
      
      fetchingUserDataRef.current = true;
      try {
        const response = await authorizedFetch(`${environment.apiUrl}/api/user/dashboard`, {
          method: 'GET'
        });
        
        if (response.ok) {
          const dashboardData = await response.json();
          // Zapisz dane użytkownika do localStorage i stanu
          if (dashboardData.user) {
            const userData = dashboardData.user;
            setUserInfo({
              userRank: userData.userRank,
              trustPoints: userData.trustPoints,
              freeOffersCount: userData.freeOffersCount
            });
            
            if (userData.userRank) {
              localStorage.setItem('userRank', userData.userRank);
            }
            if (userData.trustPoints !== undefined) {
              localStorage.setItem('trustPoints', userData.trustPoints.toString());
            }
            if (userData.freeOffersCount !== undefined) {
              localStorage.setItem('freeOffersCount', userData.freeOffersCount.toString());
            }
          }
        } else if (response.status === 401) {
          // Nie przekierowuj - może być problem z autoryzacją, ale nie blokuj dashboardu
          console.log('Brak autoryzacji dla danych użytkownika');
        }
      } catch (error) {
        console.error('Błąd pobierania danych użytkownika:', error);
        // Fallback - spróbuj pobrać z localStorage
        const userData = getUserData();
        if (userData) {
          setUserInfo({
            userRank: userData.userRank,
            trustPoints: userData.trustPoints,
            freeOffersCount: userData.freeOffersCount
          });
        }
      } finally {
        fetchingUserDataRef.current = false;
      }
    };
    
    fetchUserData();
  }, [router]);

  const handleCreateOffer = () => {
    router.push('/create-offer');
  };

  const handleSearchOffers = () => {
    router.push('/offers/search');
  };

  // Funkcja pomocnicza do renderowania wykresu popularności
  const renderPopularityChart = () => {
    if (!data || !data.popularityOverTime) return null;

    const entries = Object.entries(data.popularityOverTime).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
    
    if (entries.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
          Brak danych do wyświetlenia
        </div>
      );
    }

    const maxValue = Math.max(...entries.map(([, value]) => value));
    const minValue = Math.min(...entries.map(([, value]) => value));
    const range = maxValue - minValue || 1;
    const chartWidth = 600;
    const chartHeight = 200;
    const padding = 40;

    const points = entries.map(([date, value], index) => {
      const x = padding + (index / (entries.length - 1 || 1)) * (chartWidth - 2 * padding);
      const y = chartHeight - padding - ((value - minValue) / range) * (chartHeight - 2 * padding);
      return { x, y, date, value };
    });

    const pathData = points
      .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ');

    return (
      <div style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ minWidth: `${chartWidth}px`, width: '100%' }}>
          <svg width="100%" height={chartHeight + 60} viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`} preserveAspectRatio="xMinYMin meet" style={{ overflow: 'visible' }}>
          {/* Linie pomocnicze */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding - ratio * (chartHeight - 2 * padding);
            const value = minValue + ratio * range;
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  fontSize="12"
                  fill="#718096"
                  textAnchor="end"
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}
          
          {/* Wykres liniowy */}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
          />
          
          {/* Wypełnienie pod wykresem */}
          <path
            d={`${pathData} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`}
            fill="url(#gradient)"
            opacity="0.3"
          />
          
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Punkty */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#3b82f6"
              />
              {/* Tooltip na hover */}
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="transparent"
                style={{ cursor: 'pointer' }}
              >
                <title>{`${point.date}: ${point.value}`}</title>
              </circle>
            </g>
          ))}
          
          {/* Etykiety dat */}
          {points.filter((_, index) => index % Math.ceil(entries.length / 6) === 0 || index === entries.length - 1).map((point, index) => (
            <text
              key={index}
              x={point.x}
              y={chartHeight + 20}
              fontSize="10"
              fill="#718096"
              textAnchor="middle"
            >
              {new Date(point.date).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })}
            </text>
          ))}
          </svg>
        </div>
      </div>
    );
  };

  // Funkcja pomocnicza do renderowania wykresu CTR
  const renderCTRChart = () => {
    if (!data || !data.ctrData) return null;

    const entries = Object.values(data.ctrData);
    
    if (entries.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
          Brak danych do wyświetlenia
        </div>
      );
    }

    // Sortuj po CTR malejąco i weź top 10
    const sortedEntries = entries
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 10);

    const maxCTR = Math.max(...sortedEntries.map(e => e.ctr));
    const chartWidth = 600;
    const chartHeight = Math.min(400, sortedEntries.length * 40 + 40);
    const barHeight = (chartHeight - 60) / sortedEntries.length;
    const barStartX = 220;
    const rightPadding = 50;
    const maxBarWidth = chartWidth - barStartX - rightPadding;

    return (
      <div style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ marginBottom: '20px', fontSize: '14px', color: '#718096' }}>
          Top {sortedEntries.length} ogłoszeń
        </div>
        <div style={{ minWidth: `${chartWidth}px`, width: '100%' }}>
          <svg width="100%" height={chartHeight + 40} viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} preserveAspectRatio="xMinYMin meet">
            {sortedEntries.map((entry, index) => {
              const barWidth = (entry.ctr / maxCTR) * maxBarWidth;
              const y = 20 + index * barHeight;
              
              return (
                <g key={entry.offerId}>
                  {/* Wartość CTR po lewej */}
                  <text
                    x="10"
                    y={y + barHeight / 2 + 5}
                    fontSize="12"
                    fill="#2d3748"
                    style={{ fontWeight: 'bold' }}
                  >
                    {entry.ctr.toFixed(1)}%
                  </text>
                  
                  {/* Nazwa oferty z większym odstępem */}
                  <text
                    x="80"
                    y={y + barHeight / 2 + 5}
                    fontSize="12"
                    fill="#2d3748"
                    style={{ fontWeight: '500' }}
                  >
                    {entry.offerName.length > 35 
                      ? entry.offerName.substring(0, 32) + '...' 
                      : entry.offerName}
                  </text>
                  
                  {/* Słupek CTR */}
                  <rect
                    x={barStartX}
                    y={y}
                    width={barWidth}
                    height={barHeight - 4}
                    fill="#10b981"
                    rx="4"
                  />
                  
                  {/* Szczegóły: widoki i kliknięcia */}
                  <text
                    x={barStartX}
                    y={y + barHeight / 2 - 8}
                    fontSize="10"
                    fill="#718096"
                  >
                    {entry.views} wyświetleń, {entry.clicks} kliknięć
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7fafc',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #fbbf24',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <h2 style={{
            fontSize: '24px',
            color: '#2d3748',
            marginBottom: '8px'
          }}>
            Ładowanie dashboard...
          </h2>
          <p style={{
            color: '#4a5568',
            fontSize: '16px'
          }}>
            Pobieramy dane Twojej firmy z serwera
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7fafc',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#f87171',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 style={{
            fontSize: '24px',
            color: '#dc2626',
            marginBottom: '16px'
          }}>
            Błąd ładowania
          </h2>
          <p style={{
            color: '#4a5568',
            fontSize: '16px',
            marginBottom: '30px',
            lineHeight: '1.5'
          }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#fbbf24',
              color: '#1a202c',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fbbf24'}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      backgroundColor: '#f7fafc',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Informacje o użytkowniku (ranga i darmowe oferty) */}
        {(userInfo.userRank || userInfo.trustPoints !== undefined || userInfo.freeOffersCount !== undefined) && (
          <div style={{
            marginBottom: '30px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {userInfo.userRank && (
                <UserRankBadge 
                  rank={userInfo.userRank} 
                  trustPoints={userInfo.trustPoints}
                  showPoints={true}
                  size="medium"
                  clickable={true}
                />
              )}
              {userInfo.freeOffersCount !== undefined && (
                <FreeOffersCounter 
                  freeOffersCount={userInfo.freeOffersCount}
                  size="medium"
                />
              )}
            </div>
          </div>
        )}

        {/* Przyciski akcji */}
        <div style={{
          marginBottom: '30px',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleCreateOffer}
            style={{
              padding: '16px 32px',
              backgroundColor: '#fbbf24',
              color: '#1a202c',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f59e0b';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#fbbf24';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            Dodaj ogłoszenie
          </button>
          <button
            onClick={handleSearchOffers}
            style={{
              padding: '16px 32px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            Wyszukaj oferty
          </button>
        </div>

        {/* Sekcja podsumowania aktywności */}
        {data && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {/* Karta: Opublikowane ogłoszenia */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '24px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#718096',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Opublikowane ogłoszenia
                </div>
                <div style={{
                  fontSize: '32px',
                  color: '#2d3748',
                  fontWeight: 'bold'
                }}>
                  {data.activitySummary.totalOffers}
                </div>
              </div>

              {/* Karta: Aktywne ogłoszenia */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '24px',
                borderLeft: '4px solid #10b981'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#718096',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Aktywne ogłoszenia
                </div>
                <div style={{
                  fontSize: '32px',
                  color: '#2d3748',
                  fontWeight: 'bold'
                }}>
                  {data.activitySummary.activeOffers}
                </div>
              </div>

              {/* Karta: Oczekujące ogłoszenia */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '24px',
                borderLeft: '4px solid #f59e0b'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#718096',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Oczekujące ogłoszenia
                </div>
                <div style={{
                  fontSize: '32px',
                  color: '#2d3748',
                  fontWeight: 'bold'
                }}>
                  {data.activitySummary.pendingOffers}
                </div>
              </div>

              {/* Karta: Wygasłe ogłoszenia */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '24px',
                borderLeft: '4px solid #ef4444'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#718096',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Wygasłe ogłoszenia
                </div>
                <div style={{
                  fontSize: '32px',
                  color: '#2d3748',
                  fontWeight: 'bold'
                }}>
                  {data.activitySummary.expiredOffers}
                </div>
              </div>

              {/* Karta: Wiadomości od użytkowników */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '24px',
                borderLeft: '4px solid #8b5cf6'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#718096',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Wiadomości od użytkowników
                </div>
                <div style={{
                  fontSize: '32px',
                  color: '#2d3748',
                  fontWeight: 'bold'
                }}>
                  {data.activitySummary.messagesFromUsers}
                </div>
              </div>

              {/* Karta: Wyświetlenia */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '24px',
                borderLeft: '4px solid #06b6d4'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#718096',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Wyświetlenia profilu i ogłoszeń
                </div>
                <div style={{
                  fontSize: '32px',
                  color: '#2d3748',
                  fontWeight: 'bold'
                }}>
                  {data.activitySummary.totalViews}
                </div>
              </div>
            </div>

            {/* Sekcja mini-wykresów */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
              gap: '30px',
              marginBottom: '30px'
            }}>
              {/* Wykres popularności w czasie */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '30px'
              }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  color: '#2d3748',
                  marginBottom: '20px',
                  fontWeight: '600'
                }}>
                  Popularność ogłoszeń w czasie
                </h2>
                {renderPopularityChart()}
              </div>

              {/* Wykres CTR */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '30px',
                overflowX: 'auto'
              }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  color: '#2d3748',
                  marginBottom: '20px',
                  fontWeight: '600'
                }}>
                  CTR (Kliknięcia vs Wyświetlenia)
                </h2>
                {renderCTRChart()}
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            padding: '40px',
            textAlign: 'center'
          }}>
            <p style={{
              color: '#4a5568',
              fontSize: '16px'
            }}>
              Brak danych do wyświetlenia
            </p>
          </div>
        )}
      </div>

      {/* CSS dla animacji */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 