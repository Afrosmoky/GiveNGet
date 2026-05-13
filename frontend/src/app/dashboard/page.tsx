"use client";

import React, { useState, useEffect } from 'react';
import { getUserData } from '../../utils/auth';
import { AuthGuard } from '../../components/AuthGuard';
import { UserDashboard } from '../../components/UserDashboard';
import { CompanyDashboard } from '../../components/CompanyDashboard';

function DashboardPageContent() {
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUserData();
    if (userData && userData.userType) {
      setUserType(userData.userType);
    } else {
      console.error('Brak danych userType w localStorage');
      setUserType('REGULAR'); // fallback na dashboard użytkownika
    }
    setLoading(false);
  }, []);

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
            Inicjalizacja dashboard...
          </h2>
          <p style={{
            color: '#4a5568',
            fontSize: '16px'
          }}>
            Sprawdzamy Twój typ konta
          </p>
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

  // Wyświetl odpowiedni dashboard na podstawie userType
  if (userType === 'COMPANY') {
    return <CompanyDashboard />;
  }

  // Dla wszystkich pozostałych typów (REGULAR, EMPLOYEE, ADMIN) wyświetl dashboard użytkownika
  return <UserDashboard />;
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardPageContent />
    </AuthGuard>
  );
}