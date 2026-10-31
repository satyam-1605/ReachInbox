import {
  EmailRecord,
  ScheduleEmailPayload,
  ScheduleEmailResponse,
  SearchResponse,
  SlackStatus,
  User,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include', // sends HTTP-only JWT cookies
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          errorMessage = errorJson.error;
          if (Array.isArray(errorJson.details) && errorJson.details.length > 0) {
            const detailMessages = errorJson.details
              .map((d: { message?: string; path?: (string | number)[] }) =>
                d.message
                  ? `${d.path && d.path.length > 0 ? d.path.join('.') + ': ' : ''}${d.message}`
                  : ''
              )
              .filter(Boolean)
              .join(', ');
            if (detailMessages) {
              errorMessage = `${errorJson.error}: ${detailMessages}`;
            }
          }
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Fall back to status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth APIs
  async getMe(): Promise<{ user: User | null }> {
    try {
      const res = await this.request<{ user: User }>('/auth/me');
      return res;
    } catch {
      return { user: null };
    }
  }

  getGoogleLoginUrl(): string {
    return `${API_BASE_URL}/auth/google`;
  }

  async logout(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  // Slack APIs
  async getSlackStatus(): Promise<SlackStatus> {
    try {
      return await this.request<SlackStatus>('/auth/slack/status');
    } catch {
      return { connected: false };
    }
  }

  getSlackConnectUrl(userId?: string): string {
    return userId
      ? `${API_BASE_URL}/auth/slack/connect?userId=${encodeURIComponent(userId)}`
      : `${API_BASE_URL}/auth/slack/connect`;
  }

  async disconnectSlack(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/slack/disconnect', {
      method: 'POST',
    });
  }

  // Email Scheduling APIs
  async scheduleEmails(payload: ScheduleEmailPayload): Promise<ScheduleEmailResponse> {
    const formattedPayload = {
      ...payload,
      startTime: payload.startTime || payload.scheduledAt || new Date().toISOString(),
    };
    return this.request<ScheduleEmailResponse>('/emails/schedule', {
      method: 'POST',
      body: JSON.stringify(formattedPayload),
    });
  }

  async getScheduledEmails(): Promise<{ emails: EmailRecord[]; count: number }> {
    return this.request<{ emails: EmailRecord[]; count: number }>('/emails/scheduled');
  }

  async getSentEmails(): Promise<{ emails: EmailRecord[]; count: number }> {
    return this.request<{ emails: EmailRecord[]; count: number }>('/emails/sent');
  }

  // Elasticsearch Search API
  async searchEmails(query: string): Promise<SearchResponse> {
    const encoded = encodeURIComponent(query);
    interface BackendSearchResponse {
      query?: string;
      total?: number;
      emails?: SearchResponse['results'];
      results?: SearchResponse['results'];
    }
    const res = await this.request<BackendSearchResponse>(`/emails/search?q=${encoded}`);
    const items = res.emails || res.results || [];
    return {
      results: items,
      emails: items,
      total: res.total ?? items.length,
    };
  }

  getBullBoardUrl(): string {
    return `${API_BASE_URL}/admin/queues`;
  }
}

export const api = new ApiClient();

