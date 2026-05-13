"use client";

import { useEffect } from 'react';

export default function MobileLayoutHandler() {
  useEffect(() => {
    const handleLayoutChange = () => {
      if (typeof window !== 'undefined') {
        const isMobile = window.innerWidth < 768;
        
        // Znajdź desktopowe header i footer w desktop-layout
        const desktopLayout = document.querySelector('.desktop-layout');
        if (desktopLayout) {
          const header = desktopLayout.querySelector('header');
          const footer = desktopLayout.querySelector('footer');
          
          if (header) {
            if (isMobile) {
              // Ukryj na mobilnych
              (header as HTMLElement).style.display = 'none';
            } else {
              // Pokaż na desktopowych - przywróć oryginalny styl
              (header as HTMLElement).style.display = 'flex';
              (header as HTMLElement).style.justifyContent = 'space-between';
              (header as HTMLElement).style.alignItems = 'center';
              (header as HTMLElement).style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }
          }
          
          if (footer) {
            if (isMobile) {
              // Ukryj na mobilnych
              (footer as HTMLElement).style.display = 'none';
            } else {
              // Pokaż na desktopowych - przywróć oryginalny styl
              (footer as HTMLElement).style.display = 'block';
              (footer as HTMLElement).style.marginTop = 'auto';
            }
          }
        }
        
        // Dostosuj main
        const main = document.querySelector('main');
        if (main) {
          if (isMobile) {
            (main as HTMLElement).style.minHeight = '100vh';
          } else {
            (main as HTMLElement).style.minHeight = '';
          }
        }
      }
    };

    handleLayoutChange();
    window.addEventListener('resize', handleLayoutChange);
    
    return () => window.removeEventListener('resize', handleLayoutChange);
  }, []);

  return null;
}
