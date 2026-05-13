"use client";

import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const [showMessage, setShowMessage] = useState(false);
  const auth = useAuth({ requireAuth: false });
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    if (message === 'logged-out') {
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
      }, 5000);
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.push('/dashboard');
    }
  }, [auth.isAuthenticated, router]);

  if (auth.isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Ładowanie...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      {showMessage && (
        <div style={{
          marginBottom: '30px',
          padding: '16px',
          backgroundColor: '#f0fff4',
          border: '1px solid #68d391',
          borderRadius: '8px',
          color: '#2d3748',
          fontSize: '16px',
          fontWeight: 'bold',
          animation: 'fadeIn 0.5s ease-in'
        }}>
          ✅ Zostałeś pomyślnie wylogowany!
        </div>
      )}

      {!auth.isAuthenticated && (
        <>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#2d3748' }}>
            Witaj w GiveNGet
          </h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '40px', color: '#4a5568' }}>
            Wygląda na to, że nie jesteś zalogowany.
          </p>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" passHref>
              <button className="btn-primary" style={{ minWidth: '180px' }}>Zaloguj się</button>
            </Link>
            <Link href="/register" passHref>
              <button className="btn-secondary" style={{ minWidth: '180px' }}>Zarejestruj się</button>
            </Link>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
