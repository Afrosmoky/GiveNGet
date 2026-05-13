"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUserData, authorizedFetch } from '../../utils/auth';
import { environment } from '../../config';
import { AuthGuard } from '../../components/AuthGuard';

interface AdminData {
  // Struktura danych z API - będzie zaktualizowana na podstawie rzeczywistej odpowiedzi
  [key: string]: string | number | boolean | object | null;
}

function AdminPageContent() {
  const router = useRouter();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ id: number; userType: string; [key: string]: unknown } | null>(null);

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const checkUserAccess = () => {
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      const user = getUserData();
      if (!user || (user.userType !== 'ADMIN' && user.userType !== 'EMPLOYEE')) {
        router.push('/unauthorized');
        return;
      }

      if (user && user.id && user.userType) {
        setUserData(user as { id: number; userType: string; [key: string]: unknown });
      }
      fetchAdminData(user.userType);
    };

    checkUserAccess();
  }, [router]);

  const fetchAdminData = async (userType: string) => {
    try {
      setLoading(true);
      setError(null);

      // Wybierz endpoint na podstawie roli użytkownika
      const endpoint = userType === 'ADMIN' 
        ? `${environment.apiUrl}/api/admin`
        : `${environment.apiUrl}/api/mod`;

      const response = await authorizedFetch(endpoint);

      if (response.ok) {
        const responseText = await response.text();
        setAdminData({ response: responseText });
      } else {
        const errorText = await response.text();
        setError(`Błąd pobierania danych: ${errorText}`);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania danych administracyjnych:', error);
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (userData) {
      fetchAdminData(userData.userType);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie panelu administracyjnego...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Panel administracyjny
              </h1>
              <p className="text-gray-600 mt-2">
                Rola: <span className="font-semibold text-blue-600">
                  {userData?.userType === 'ADMIN' ? 'Administrator' : 'Pracownik'}
                </span>
              </p>
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
        </div>

        {/* Zawartość panelu */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Dane z API
          </h2>
          
          {adminData ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Odpowiedź z serwera:</h3>
                <pre className="text-sm text-gray-900 whitespace-pre-wrap overflow-x-auto">
                  {typeof adminData.response === 'string' ? adminData.response : JSON.stringify(adminData.response)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Brak danych do wyświetlenia</p>
            </div>
          )}
        </div>

        {/* Informacje o endpointach */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Informacje o endpointach:</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Administrator:</strong> GET {environment.apiUrl}/api/admin</p>
            <p><strong>Pracownik:</strong> GET {environment.apiUrl}/api/mod</p>
          </div>
        </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminPageContent />
    </AuthGuard>
  );
}
