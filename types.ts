
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export interface User {
  id: string;
  email: string;
  passwordHash: string; // In real app, never store plain text
  role: Role;
  name: string;
  building: 'A' | 'B';
  floor: string;
  door: string;
  
  // Status Flags
  isVerified: boolean;   // Email verification status (was isActive previously)
  isSuspended: boolean;  // Admin imposed ban
  
  loginCount: number;
  lastLogin: string;
  favorites: string[]; // Array of Song IDs
  
  // UI Preferences
  themePreference: 'dark' | 'light';
}

export interface Song {
  id: string; // Song Number (e.g., 10423)
  title: string;
  artist: string;
  language: string;
  tags?: string[];
  addedAt: string;
  isDeleted?: boolean; // Soft delete flag
}

export interface SongRequest {
  id: string;
  songId: string;
  userId: string;
  requestedAt: string;
  status: 'queued' | 'played' | 'cancelled';
  keyShift?: number; // -4 to +4, 0 is original
}

export interface RankingItem {
  song: Song;
  count: number;
}

export type FeedbackType = 'issue' | 'suggestion' | 'praise' | 'other';

export interface Feedback {
  id: string;
  userId?: string; // Optional (if logged in)
  name: string;    // Display Name (or Input Name)
  email: string;
  phone: string;
  type: FeedbackType;
  content: string;
  createdAt: string;
  isRead: boolean;
}
