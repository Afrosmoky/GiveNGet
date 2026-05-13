import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, verifyToken, redirectToLogin } from '../utils/auth';

interface UseAuthOptions {
  requireAuth?: boolean; // Czy strona wymaga autoryzacji
  redirectTo?: string; // Ścieżka do przekierowania po weryfikacji
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const { requireAuth = true, redirectTo } = options;
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthValid, setIsAuthValid] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);

      // Jeśli strona nie wymaga autoryzacji, nie sprawdzaj
      if (!requireAuth) {
        setIsLoading(false);
        setIsAuthValid(true);
        return;
      }

      // Sprawdź czy użytkownik jest zalogowany lokalnie
      if (!isAuthenticated()) {
        setIsAuthValid(false);
        setIsLoading(false);
        redirectToLogin(pathname);
        return;
      }

      // Zweryfikuj token na serwerze
      const isValid = await verifyToken();
      
      if (isValid) {
        setIsAuthValid(true);
        
        // Jeśli podano redirectTo, przekieruj tam
        if (redirectTo) {
          router.push(redirectTo);
        }
      } else {
        setIsAuthValid(false);
        redirectToLogin(pathname);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [requireAuth, redirectTo, router, pathname]);

  return {
    isLoading,
    isAuthValid,
    isAuthenticated: isAuthenticated()
  };
}; 