/**
 * Skargi i notatki moderatorskie — kształt odpowiedzi GET /api/mod/complaints
 * i /api/mod/complaints/{id}/notes (stare endpointy, bez paginacji po stronie API).
 */
export type ComplaintType = 'CHAT' | 'OFFER';

export interface ComplaintDto {
  id: number;
  type: ComplaintType;
  explanation: string;
  reporterId: number | null;
  reporterUserName: string | null;
  reportedUserId: number | null;
  reportedUserName: string | null;
  chatId: number | null;
  messageId: number | null;
  offerId: string | null;
  resolved: boolean;
  /** ISO */
  createdAt: string;
  notesCount: number;
}

export interface ComplaintNote {
  id: number;
  complaintId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

/** Wiadomość z fragmentu czatu, którego dotyczy skarga. */
export interface ChatSnippetMessage {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  messageType: string;
}
