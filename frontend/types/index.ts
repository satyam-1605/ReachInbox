export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export type EmailStatus = 'SCHEDULED' | 'QUEUED' | 'SENT' | 'FAILED' | 'RESCHEDULED';

export interface EmailRecord {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  errorMessage?: string | null;
  senderId?: string;
  sender?: {
    id: string;
    email: string;
    name?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEmailPayload {
  recipients: string[];
  subject: string;
  body: string;
  startTime?: string;
  scheduledAt?: string;
  delayBetweenEmailsMs?: number;
  hourlyLimit?: number;
  userId?: string;
  senderId?: string;
}

export interface ScheduleEmailResponse {
  message: string;
  count: number;
  emails: EmailRecord[];
}

export interface SlackStatus {
  connected: boolean;
  teamId?: string | null;
  teamName?: string | null;
  channel?: string | null;
}

export interface SearchEmailItem {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
}

export interface SearchResponse {
  results: SearchEmailItem[];
  emails?: SearchEmailItem[];
  total: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

