"use client";

import React, { useState, useEffect } from 'react';
import { environment } from '../config';

interface TestData {
  info: string;
  testy: string;
}

export const TestPage: React.FC = () => {
  const [data, setData] = useState<TestData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = `${environment.apiUrl}/test`;
        console.log('Wywołuję URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors', // Explicite ustawienie CORS
        });
        
        console.log('Odpowiedź:', response);
        console.log('Status:', response.status);
        console.log('Headers:', response.headers);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: TestData[] = await response.json();
        console.log('Dane:', result);
        setData(result);
      } catch (err) {
        console.error('Błąd fetch:', err);
        setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Ładowanie danych...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>Błąd: {error}</h2>
        <p>Sprawdź konsolę przeglądarki dla więcej szczegółów</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dane testowe z API</h1>
      <p>Źródło: {environment.apiUrl}/test</p>
      
      {data.length === 0 ? (
        <p>Brak danych do wyświetlenia</p>
      ) : (
        <div>
          <h2>Wyniki ({data.length}):</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {data.map((item, index) => (
              <li 
                key={index} 
                style={{ 
                  border: '1px solid #ccc', 
                  margin: '10px 0', 
                  padding: '15px', 
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <div><strong>Info:</strong> {item.info}</div>
                <div><strong>Testy:</strong> {item.testy}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};