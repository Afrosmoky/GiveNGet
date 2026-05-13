import React from 'react';

/**
 * Ujednolicone breakpointy dla responsywności
 * 
 * Wszystkie komponenty powinny używać tych samych wartości:
 * 
 * - MOBILE: 0-767px (domyślny widok)
 * - SM: 640px+ (małe tablety)
 * - MD: 768px+ (tablety landscape)
 * - LG: 1024px+ (desktopy)
 * - XL: 1280px+ (duże desktopy)
 * - 2XL: 1536px+ (bardzo duże desktopy)
 * 
 * Tailwind CSS breakpointy:
 * - sm: 640px+
 * - md: 768px+
 * - lg: 1024px+
 * - xl: 1280px+
 * - 2xl: 1536px+
 * 
 * Zasady używania:
 * 1. Mobile first - zawsze zaczynaj od widoku mobilnego
 * 2. Używaj lg: dla przełączania z 1 kolumny na 2 kolumny
 * 3. Używaj md: dla przełączania z 1 kolumny na 2 kolumny tylko w specjalnych przypadkach
 * 4. Używaj sm: dla małych zmian (padding, margin, rozmiar tekstu)
 */

export const BREAKPOINTS = {
  // Mobile first - domyślny widok
  MOBILE: 0,
  
  // Small devices (tablets) - 640px i więcej
  SM: 640,
  
  // Medium devices (tablets landscape) - 768px i więcej  
  MD: 768,
  
  // Large devices (desktops) - 1024px i więcej
  LG: 1024,
  
  // Extra large devices (large desktops) - 1280px i więcej
  XL: 1280,
  
  // 2XL devices (very large desktops) - 1536px i więcej
  '2XL': 1536,
} as const;

// Hook do sprawdzania rozmiaru ekranu
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.MD) {
        setScreenSize('mobile');
      } else if (width < BREAKPOINTS.LG) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

// Funkcja do sprawdzania czy ekran jest mobilny
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.MD;
};

// Funkcja do sprawdzania czy ekran jest tabletem
export const isTablet = () => {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  return width >= BREAKPOINTS.MD && width < BREAKPOINTS.LG;
};

// Funkcja do sprawdzania czy ekran jest desktopem
export const isDesktop = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.LG;
}; 