import { useState } from 'react';
import { environment } from '../config';
import { authorizedFetch } from '../utils/auth';

export const useFavorites = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const toggleFavorite = async (offerId: string, currentIsFavorite: boolean, onError?: (message: string) => void) => {
    if (loading[offerId]) return; // Zapobiegaj wielokrotnym kliknięciom

    setLoading(prev => ({ ...prev, [offerId]: true }));

    try {
      const method = currentIsFavorite ? 'DELETE' : 'POST';
      const response = await authorizedFetch(`${environment.apiUrl}/api/favorites/${offerId}`, {
        method,
      });

      if (response.ok) {
        return !currentIsFavorite; // Zwróć nowy stan
      } else {
        // Pobierz komunikat błędu z response
        const errorText = await response.text();
        const errorMessage = errorText || `Błąd podczas ${currentIsFavorite ? 'usuwania z' : 'dodawania do'} ulubionych`;
        
        console.error('Błąd podczas aktualizacji ulubionych:', response.status, errorMessage);
        
        // Wywołaj callback z błędem jeśli jest dostępny
        if (onError) {
          onError(errorMessage);
        }
        
        return currentIsFavorite; // Zachowaj obecny stan w przypadku błędu
      }
    } catch (error) {
      const errorMessage = `Błąd połączenia z serwerem`;
      console.error('Błąd podczas aktualizacji ulubionych:', error);
      
      // Wywołaj callback z błędem jeśli jest dostępny
      if (onError) {
        onError(errorMessage);
      }
      
      return currentIsFavorite; // Zachowaj obecny stan w przypadku błędu
    } finally {
      setLoading(prev => ({ ...prev, [offerId]: false }));
    }
  };

  return {
    toggleFavorite,
    loading: (offerId: string) => loading[offerId] || false
  };
};
