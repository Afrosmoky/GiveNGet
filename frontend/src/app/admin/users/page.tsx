"use client";

import React, { useState, useEffect, useRef } from 'react';
import { environment } from '../../../config';
import { authorizedFetch, getUserData } from '../../../utils/auth';
import { TbDotsVertical } from "react-icons/tb";


interface UserStats {
  totalUsers: {
    total: number;
    active: number;
    banned: number;
  };
  companies: {
    total: number;
    active: number;
    banned: number;
  };
  registrations: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  verified: boolean;
  banned: boolean;
  createDate: string;
}

interface UsersResponse {
  users: User[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface UserFilters {
  page: number;
  size: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  userType: string;
  verified: boolean | null;
  banned: boolean | null;
}

export default function UsersPage() {
  const [data, setData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stan dla listy użytkowników
  const [usersData, setUsersData] = useState<UsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'list'>('stats');
  
  // Filtry dla listy użytkowników
  const [filters, setFilters] = useState<UserFilters>({
    page: 0,
    size: 20,
    sortBy: 'createDate',
    sortDirection: 'desc',
    searchTerm: '',
    userType: '',
    verified: null,
    banned: null
  });

  // Stan dla menu kebab
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [banningUserId, setBanningUserId] = useState<number | null>(null);
  
  // Stan dla ban/unban
  const [banReason, setBanReason] = useState('');
  const [banReasonCode, setBanReasonCode] = useState<number | null>(null);
  const [banDurationDays, setBanDurationDays] = useState<number | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{id: number, name: string, banned: boolean} | null>(null);
  const [banAction, setBanAction] = useState<'ban' | 'unban'>('ban');
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

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    
    // Sprawdź rolę użytkownika
    const user = getUserData();
    if (user && (user.userType === 'ADMIN' || user.userType === 'EMPLOYEE')) {
      setUserRole(user.userType);
    }
    
    fetchUserStats();
  }, []);

  // Zamykanie menu przy kliknięciu poza nim
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authorizedFetch(`${environment.apiUrl}/api/admin/user-stats`);

      if (response.ok) {
        const responseData = await response.json();
        setData(responseData);
      } else {
        const errorText = await response.text();
        setError(`Błąd pobierania danych: ${errorText}`);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania statystyk użytkowników:', error);
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchUserStats();
  };

  const fetchUsers = async (newFilters?: Partial<UserFilters>) => {
    try {
      setUsersLoading(true);
      setUsersError(null);

      const currentFilters = { ...filters, ...newFilters };
      const params = new URLSearchParams();
      
      // Dodaj parametry do URL
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== null && value !== '' && value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await authorizedFetch(`${environment.apiUrl}/api/admin/users?${params.toString()}`);

      if (response.ok) {
        const responseData = await response.json();
        setUsersData(responseData);
        setFilters(currentFilters);
      } else {
        const errorText = await response.text();
        setUsersError(`Błąd pobierania listy użytkowników: ${errorText}`);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania listy użytkowników:', error);
      setUsersError('Błąd połączenia z serwerem');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleFilterChange = (key: keyof UserFilters, value: string | boolean | number) => {
    const newFilters = { ...filters, [key]: value, page: 0 }; // Resetuj stronę przy zmianie filtra
    fetchUsers(newFilters);
  };

  const handlePageChange = (page: number) => {
    fetchUsers({ page });
  };

  const handleSort = (sortBy: string) => {
    const newDirection = filters.sortBy === sortBy && filters.sortDirection === 'asc' ? 'desc' : 'asc';
    fetchUsers({ sortBy, sortDirection: newDirection, page: 0 });
  };

  const handleBanUser = async (userId: number, banned: boolean) => {
    try {
      setBanningUserId(userId);

      const url = new URL(`${environment.apiUrl}/api/mod/users/${userId}/ban`);
      url.searchParams.set('banned', banned.toString());

      if (banned) {
        // Banowanie - wymagane parametry
        if (!banReasonCode) {
          alert('Proszę wybrać kod powodu bana');
          setBanningUserId(null);
          return;
        }
        
        url.searchParams.set('reasonCode', banReasonCode.toString());
        
        // Dla kodu 401 (Inne) wymagany jest dodatkowy opis
        if (banReasonCode === 401 && !banReason.trim()) {
          alert('Powód "Inne" wymaga dodatkowego opisu');
          setBanningUserId(null);
          return;
        }
        
        // Dodaj reason jeśli został podany
        if (banReason.trim()) {
          url.searchParams.set('reason', banReason.trim());
        }
        
        // Dodaj durationDays jeśli został podany (lub null dla permanentnego bana - tylko dla admina)
        if (banDurationDays !== null && banDurationDays > 0) {
          url.searchParams.set('durationDays', banDurationDays.toString());
        } else if (userRole === 'EMPLOYEE') {
          // Moderator musi podać durationDays
          alert('Moderator musi podać czas trwania bana (liczba dni). Ban permanentny jest dostępny tylko dla administratorów.');
          setBanningUserId(null);
          return;
        }
        // Dla admina, jeśli durationDays jest null lub 0, ban jest permanentny (nie dodajemy parametru)
      } else {
        // Odbanowanie - opcjonalny reason
        if (banReason.trim()) {
          url.searchParams.set('reason', banReason.trim());
        }
      }

      console.log('Making request to:', url.toString());

      const response = await authorizedFetch(url.toString(), {
        method: 'PATCH'
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        console.log('Ban operation successful');
        // Odśwież listę użytkowników
        await fetchUsers();
        // Odśwież statystyki
        await fetchUserStats();
        // Zamknij modal i wyczyść stan
        setShowBanModal(false);
        setBanReason('');
        setBanReasonCode(null);
        setBanDurationDays(null);
        setSelectedUser(null);
      } else {
        const errorText = await response.text();
        console.error('Błąd zmiany statusu użytkownika:', errorText);
        alert(`Błąd: ${errorText}`);
      }
    } catch (error) {
      console.error('Błąd podczas zmiany statusu użytkownika:', error);
      alert('Błąd połączenia z serwerem');
    } finally {
      setBanningUserId(null);
    }
  };

  const openBanModal = (user: {id: number, name: string, banned: boolean}) => {
    console.log('openBanModal called with:', user);
    console.log('Setting showBanModal to true');
    setSelectedUser(user);
    setBanAction(user.banned ? 'unban' : 'ban');
    setBanReason('');
    setBanReasonCode(null);
    // Dla moderatorów domyślnie ustaw ban czasowy na 7 dni
    // Dla adminów domyślnie null (możliwość wyboru permanentnego)
    setBanDurationDays(userRole === 'EMPLOYEE' ? 7 : null);
    setShowBanModal(true);
    setOpenMenuId(null);
    console.log('Modal should be visible now');
  };

  const closeBanModal = () => {
    setShowBanModal(false);
    setBanReason('');
    setBanReasonCode(null);
    setBanDurationDays(null);
    setSelectedUser(null);
  };

  const confirmBanUser = () => {
    if (selectedUser) {
      handleBanUser(selectedUser.id, selectedUser.banned);
    }
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie statystyk użytkowników...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-800 mb-2">Błąd</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Użytkownicy</h1>
            <p className="text-gray-600 mt-2">Zarządzanie użytkownikami i statystyki</p>
          </div>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Odśwież
          </button>
        </div>
        
        {/* Tabs */}
        <div className="mt-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Statystyki
              </button>
              <button
                onClick={() => {
                  setActiveTab('list');
                  if (!usersData) {
                    fetchUsers();
                  }
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'list'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 Lista użytkowników
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'stats' && data ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Statystyki użytkowników</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Łącznie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktywne
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zablokowane
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Użytkownicy */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-medium">👤</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Użytkownicy razem</div>
                        <div className="text-sm text-gray-500">Osoby fizyczne i firmy</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="text-lg font-semibold">{data.totalUsers.total.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    <span className="text-lg font-semibold">{data.totalUsers.active.toLocaleString()}</span>
                    <div className="text-xs text-gray-500">
                      ({Math.round((data.totalUsers.active / data.totalUsers.total) * 100)}%)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    <span className="text-lg font-semibold">{data.totalUsers.banned.toLocaleString()}</span>
                    <div className="text-xs text-gray-500">
                      ({Math.round((data.totalUsers.banned / data.totalUsers.total) * 100)}%)
                    </div>
                  </td>
                </tr>

                {/* Firmy */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-sm font-medium">🏢</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Firmy</div>
                        <div className="text-sm text-gray-500">Podmioty gospodarcze</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="text-lg font-semibold">{data.companies.total.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    <span className="text-lg font-semibold">{data.companies.active.toLocaleString()}</span>
                    <div className="text-xs text-gray-500">
                      ({Math.round((data.companies.active / data.companies.total) * 100)}%)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    <span className="text-lg font-semibold">{data.companies.banned.toLocaleString()}</span>
                    <div className="text-xs text-gray-500">
                      ({Math.round((data.companies.banned / data.companies.total) * 100)}%)
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rejestracje */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nowe rejestracje</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                      <span className="text-yellow-600 text-sm font-medium">📅</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Dzisiaj</p>
                    <p className="text-2xl font-bold text-gray-900">{data.registrations.daily}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">📊</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Ten tydzień</p>
                    <p className="text-2xl font-bold text-gray-900">{data.registrations.weekly}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 text-sm font-medium">📈</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Ten miesiąc</p>
                    <p className="text-2xl font-bold text-gray-900">{data.registrations.monthly}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <></>
      )}

      {/* Lista użytkowników */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Filtry */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtry i wyszukiwanie</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Wyszukiwanie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wyszukaj
                </label>
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  placeholder="Imię, nazwisko, email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Typ użytkownika */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ użytkownika
                </label>
                <select
                  value={filters.userType}
                  onChange={(e) => handleFilterChange('userType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Wszystkie</option>
                  <option value="USER">Użytkownik</option>
                  <option value="COMPANY">Firma</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="EMPLOYEE">Pracownik</option>
                </select>
              </div>

              {/* Status weryfikacji */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weryfikacja
                </label>
                <select
                  value={filters.verified === null ? '' : filters.verified.toString()}
                  onChange={(e) => handleFilterChange('verified', e.target.value === '' ? false : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Wszystkie</option>
                  <option value="true">Zweryfikowani</option>
                  <option value="false">Niezweryfikowani</option>
                </select>
              </div>

              {/* Status zablokowania */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.banned === null ? '' : filters.banned.toString()}
                  onChange={(e) => handleFilterChange('banned', e.target.value === '' ? false : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Wszystkie</option>
                  <option value="false">Aktywni</option>
                  <option value="true">Zablokowani</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabela użytkowników */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-3 border-gray-200 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Ładowanie listy użytkowników...</p>
              </div>
            ) : usersError ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-red-700 mb-4">{usersError}</p>
                <button
                  onClick={() => fetchUsers()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Spróbuj ponownie
                </button>
              </div>
            ) : usersData ? (
              <>
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Lista użytkowników ({usersData.totalElements})
                    </h3>
                    <div className="text-sm text-gray-500">
                      Strona {usersData.currentPage + 1} z {usersData.totalPages}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('firstName')}
                        >
                          <div className="flex items-center gap-1">
                            Imię i nazwisko
                            {filters.sortBy === 'firstName' && (
                              <span className="text-blue-600">
                                {filters.sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center gap-1">
                            Email
                            {filters.sortBy === 'email' && (
                              <span className="text-blue-600">
                                {filters.sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Telefon
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('createDate')}
                        >
                          <div className="flex items-center gap-1">
                            Data rejestracji
                            {filters.sortBy === 'createDate' && (
                              <span className="text-blue-600">
                                {filters.sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Akcja
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {usersData.users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                  <span className="text-gray-600 text-sm font-medium">
                                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">ID: {user.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.phoneNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {user.verified ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✓ Zweryfikowany
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  ⏳ Niezweryfikowany
                                </span>
                              )}
                              {user.banned ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  🚫 Zablokowany
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✅ Aktywny
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createDate).toLocaleDateString('pl-PL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="relative">
                              <button
                                onClick={() => {
                                  setOpenMenuId(openMenuId === user.id ? null : user.id);
                                }}
                                disabled={banningUserId === user.id}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {banningUserId === user.id ? (
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <TbDotsVertical className="w-4 h-4" />
                                )}
                              </button>
                              
                              {openMenuId === user.id && (
                                <div 
                                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200" 
                                  style={{zIndex: 9999}}
                                >
                                  <div className="py-1">
                                    {user.banned ? (
                                      <button
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openBanModal({id: user.id, name: `${user.firstName} ${user.lastName}`, banned: user.banned});
                                        }}
                                        onTouchStart={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openBanModal({id: user.id, name: `${user.firstName} ${user.lastName}`, banned: user.banned});
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                                      >
                                        <span className="mr-2">✅</span>
                                        Odblokuj
                                      </button>
                                    ) : (
                                      <button
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openBanModal({id: user.id, name: `${user.firstName} ${user.lastName}`, banned: user.banned});
                                        }}
                                        onTouchStart={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openBanModal({id: user.id, name: `${user.firstName} ${user.lastName}`, banned: user.banned});
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                      >
                                        <span className="mr-2">🚫</span>
                                        Zablokuj
                                      </button>
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

                {/* Paginacja */}
                {usersData.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Pokazuję {usersData.currentPage * usersData.pageSize + 1} do {Math.min((usersData.currentPage + 1) * usersData.pageSize, usersData.totalElements)} z {usersData.totalElements} wyników
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(usersData.currentPage - 1)}
                          disabled={usersData.currentPage === 0}
                          className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Poprzednia
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, usersData.totalPages) }, (_, i) => {
                            const page = i;
                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1 border rounded text-sm font-medium ${
                                  page === usersData.currentPage
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {page + 1}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => handlePageChange(usersData.currentPage + 1)}
                          disabled={usersData.currentPage >= usersData.totalPages - 1}
                          className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Następna
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Kliknij na listę użytkowników aby załadować dane</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal ban/unban */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 pt-4 sm:pt-4 pb-20 sm:pb-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[calc(100vh-6rem)] sm:max-h-[80vh] flex flex-col mt-0 sm:mt-0">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                {banAction === 'unban' ? 'Odblokuj użytkownika' : 'Zablokuj użytkownika'}
              </h2>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                Użytkownik: <span className="font-medium">{selectedUser.name}</span>
              </p>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-4">
                {banAction === 'ban' ? (
                  <>
                    {/* Kod powodu bana - wymagany dla banowania */}
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
                  </>
                ) : (
                  /* Odbanowanie - tylko opcjonalny powód */
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Powód odbanowania (opcjonalnie)
                    </label>
                    <textarea
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Problem został rozwiązany..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Opcjonalny powód odbanowania użytkownika
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-white sticky bottom-0">
              <button
                onClick={closeBanModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base"
              >
                Anuluj
              </button>
              <button
                onClick={confirmBanUser}
                disabled={banningUserId === selectedUser.id}
                  className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                    banAction === 'unban'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {banningUserId === selectedUser.id ? (
                    "Przetwarzanie..."
                  ) : (
                    banAction === 'unban' ? 'Odblokuj' : 'Zablokuj'
                  )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
