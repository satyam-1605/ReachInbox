import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import DashboardPage from './page';
import { api } from '@/lib/api';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}));

describe('DashboardPage Landing Auth Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated visitor to /login on landing', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ user: null });
    vi.spyOn(api, 'getScheduledEmails').mockResolvedValue({ emails: [], count: 0 });
    vi.spyOn(api, 'getSentEmails').mockResolvedValue({ emails: [], count: 0 });
    vi.spyOn(api, 'getSlackStatus').mockResolvedValue({ connected: false });

    render(<DashboardPage />);

    // Should show auth loading screen first
    expect(screen.getByTestId('auth-loading-screen')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('renders dashboard when visitor is authenticated', async () => {
    const mockUser = {
      id: 'usr-1',
      name: 'Alex Johnson',
      email: 'alex@reachinbox.ai',
    };

    vi.spyOn(api, 'getMe').mockResolvedValue({ user: mockUser });
    vi.spyOn(api, 'getScheduledEmails').mockResolvedValue({ emails: [], count: 0 });
    vi.spyOn(api, 'getSentEmails').mockResolvedValue({ emails: [], count: 0 });
    vi.spyOn(api, 'getSlackStatus').mockResolvedValue({ connected: false });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('auth-loading-screen')).not.toBeInTheDocument();
      expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
    });
  });

  it('renders extended search bar and allows interactive status filtering', async () => {
    const mockUser = {
      id: 'usr-1',
      name: 'Alex Johnson',
      email: 'alex@reachinbox.ai',
    };

    const mockScheduled = [
      {
        id: 'email-1',
        recipient: 'alice@example.com',
        subject: 'Scheduled Subject',
        body: 'Hello Alice',
        status: 'SCHEDULED' as const,
        scheduledAt: '2026-10-31T10:00:00.000Z',
        createdAt: '2026-10-31T09:00:00.000Z',
        updatedAt: '2026-10-31T09:00:00.000Z',
      },
      {
        id: 'email-2',
        recipient: 'bob@example.com',
        subject: 'Rescheduled Subject',
        body: 'Hello Bob',
        status: 'RESCHEDULED' as const,
        scheduledAt: '2026-10-31T11:00:00.000Z',
        createdAt: '2026-10-31T09:30:00.000Z',
        updatedAt: '2026-10-31T09:30:00.000Z',
      },
    ];

    vi.spyOn(api, 'getMe').mockResolvedValue({ user: mockUser });
    vi.spyOn(api, 'getScheduledEmails').mockResolvedValue({ emails: mockScheduled, count: 2 });
    vi.spyOn(api, 'getSentEmails').mockResolvedValue({ emails: [], count: 0 });
    vi.spyOn(api, 'getSlackStatus').mockResolvedValue({ connected: false });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    // Check SearchBar placeholder
    expect(screen.getByPlaceholderText('Search emails (recipient, subject, body)...')).toBeInTheDocument();

    // Click filter button
    const filterBtn = screen.getByRole('button', { name: /filter emails/i });
    fireEvent.click(filterBtn);

    // Popover is open
    expect(screen.getByText('Filter & Sort')).toBeInTheDocument();

    // Click Rescheduled filter
    const rescheduledOption = screen.getByRole('button', { name: /rescheduled/i });
    fireEvent.click(rescheduledOption);

    // Only email-2 should now be visible
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();

    // Reset filter
    const clearBtn = screen.getByRole('button', { name: /clear filter/i });
    fireEvent.click(clearBtn);

    // Both should be visible again
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });
});

