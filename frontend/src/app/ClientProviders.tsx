"use client";
import { useEffect, useState } from "react";
import { getUserData, isAuthenticated, addAuthChangeListener, removeAuthChangeListener } from "../utils/auth";
import { WebSocketProvider } from "../context/WebSocketContext";
import { Header } from "../components/Header";
import FCMProvider from "../components/FCMProvider";
import { Footer } from "../components/Footer";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const updateUserId = () => {
      const data = getUserData();
      if (isAuthenticated() && data?.id && data.id > 0) {
        setUserId(data.id);
      } else {
        setUserId(null);
      }
    };
    updateUserId();
    addAuthChangeListener(updateUserId);
    return () => {
      removeAuthChangeListener(updateUserId);
    };
  }, []);

  return (
    <FCMProvider>
      <WebSocketProvider userId={userId}>
        <Header />
        <main>{children}</main>
        <Footer />
      </WebSocketProvider>
    </FCMProvider>
  );
} 