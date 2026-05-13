// Typ wiadomości wysyłanej przez WebSocket
export type OutgoingMessagePayload =
  | {
      chatId: number;
      senderId: number;
      content: string;
      messageType: string;
    }
  | {
      chatId: null;
      recipientId: number;
      content: string;
      messageType: string;
    };

// Typ dla firebase compat
export interface FirebaseMessagingCompat {
  messaging: () => {
    getToken: () => Promise<string>;
    onMessage: (callback: (payload: unknown) => void) => void;
  };
} 