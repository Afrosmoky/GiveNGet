"use client";

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'biovlo:sidebar-collapsed';

/**
 * Stan zwinięcia sidebara konsoli (tryb „rail”), zapamiętany w localStorage.
 * `animate` włącza się dopiero po odczycie zapisanego stanu — bez tego sidebar
 * przy każdym wejściu „zwijałby się” na oczach użytkownika.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // Brak dostępu do storage (tryb prywatny itp.) — zostaje rozwinięty
    }
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // jw.
      }
      return next;
    });
  }, []);

  return { collapsed, toggle, animate };
}
