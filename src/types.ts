import { Timestamp } from './firebase';

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Timestamp;
  metadata?: any;
  audioBase64?: string;
}

export interface Entry {
  id: string;
  userId: string;
  type: 'note' | 'task' | 'request' | 'chat' | 'transcript';
  content: string;
  title?: string;
  status?: 'pending' | 'working' | 'done';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tags?: string[];
  metadata?: any;
  messages?: Message[];
  summary?: string;
}
