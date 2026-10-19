"use client";

import { useState, useEffect } from 'react';
import { getUserData } from '../../utils/auth';
import { AuthGuard } from '../../components/AuthGuard';
import { UserDashboard } from '../../components/UserDashboard';
import { CompanyDashboard } from '../../components/CompanyDashboard';
import { Spinner } from '../../components/ui';

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Wczytywanie pulpitu" />
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