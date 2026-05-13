"use client";

import { useEffect } from 'react';

interface AdSenseAdProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  adStyle?: React.CSSProperties;
  className?: string;
}

export default function AdSenseAd({ 
  adSlot, 
  adFormat = 'auto', 
  adStyle = { display: 'block' },
  className = ''
}: AdSenseAdProps) {
  useEffect(() => {
    try {
      // Sprawdź czy AdSense jest załadowany
      if (typeof window !== 'undefined' && (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle) {
        // Pokaż reklamę
        const adsbygoogle = (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle || [];
        adsbygoogle.push({});
        (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = adsbygoogle;
      }
    } catch (error) {
      console.error('Błąd ładowania reklamy AdSense:', error);
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={adStyle}
      data-ad-client="ca-pub-8145980401715347"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
}
