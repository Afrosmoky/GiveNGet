import { environment } from '../config';

/**
 * Generuje URL obrazka na podstawie środowiska
 * @param imagePath - ścieżka do obrazka z backendu
 * @returns URL obrazka odpowiedni dla danego środowiska
 */
export const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return "/images/food-image.svg";
  
  if (environment.environmentName === 'local') {
    // Usuń /static z początku jeśli istnieje
    const cleanPath = imagePath.startsWith('/static/') ? imagePath.substring(8) : imagePath;
    return `${environment.apiUrl}/api/static/${cleanPath}`;
  } else {
    return `/backend-assets/${imagePath}`;
  }
}; 