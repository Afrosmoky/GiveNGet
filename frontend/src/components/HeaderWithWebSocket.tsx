"use client";
import { useEffect, useState, ReactNode } from "react";
import { getUserData, isAuthenticated, addAuthChangeListener, removeAuthChangeListener } from "../utils/auth";
import { WebSocketProvider } from "../context/WebSocketContext";
import { Header } from "./Header";
import FCMProvider from "./FCMProvider";

interface HeaderWithWebSocketProps {
  children?: ReactNode;
}

export default function HeaderWithWebSocket({ children }: HeaderWithWebSocketProps) {
  const [userId, setUserId] = useState<number | null>(null);

  const updateUserId = () => {
    const data = getUserData();
    // Sprawdzamy czy użytkownik jest zalogowany i czy id jest większe od 0
    if (isAuthenticated() && data?.id && data.id > 0) {
      setUserId(data.id);
    } else {
      setUserId(null);
    }
  };

  useEffect(() => {
    updateUserId();
    
    // Dodaj listener do zmian autoryzacji
    addAuthChangeListener(updateUserId);
    
    return () => {
      removeAuthChangeListener(updateUserId);
    };
  }, []);

  return (
    <FCMProvider>
      <WebSocketProvider userId={userId}>
        <Header />
        {children}
      </WebSocketProvider>
    </FCMProvider>
  );
} 