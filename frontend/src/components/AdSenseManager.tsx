"use client";

interface AdSenseManagerProps {
  children: React.ReactNode;
}

export default function AdSenseManager({ children }: AdSenseManagerProps) {
  // Na razie nie wyłączamy reklam dla żadnego typu konta
  // Logika wyłączania będzie dodana w późniejszym czasie
  
  return <>{children}</>;
}
