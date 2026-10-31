import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ScheduledTab } from './ScheduledTab';
import { EmailRecord } from '@/types';

describe('ScheduledTab States (Skeleton Loading, Empty, Error, Data, Refresh)', () => {
  const mockOnRefresh = vi.fn();
  const mockOnCompose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton shimmer loading rows when isLoading is true', () => {
    render(
      <ScheduledTab
        emails={[]}
        isLoading={true}
        error={null}
        onRefresh={mockOnRefresh}
        onComposeClick={mockOnCompose}
      />
    );

    expect(screen.getByText(/Loading scheduled queue/i)).toBeInTheDocument();
    expect(screen.getByTestId('email-skeleton-list')).toBeInTheDocument();
    const rows = screen.getAllByTestId('email-skeleton-row');
    expect(rows.length).toBe(5);
  });

  it('renders Figma empty state when emails list is empty', () => {
    render(
      <ScheduledTab
        emails={[]}
        isLoading={false}
        error={null}
        onRefresh={mockOnRefresh}
        onComposeClick={mockOnCompose}
      />
    );

    expect(screen.getByText(/No scheduled emails/i)).toBeInTheDocument();
    expect(screen.getByText(/Compose Email/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Compose Email/i));
    expect(mockOnCompose).toHaveBeenCalledTimes(1);
  });

  it('renders error banner with retry button when error is provided', () => {
    render(
      <ScheduledTab
        emails={[]}
        isLoading={false}
        error="Network connection failure"
        onRefresh={mockOnRefresh}
        onComposeClick={mockOnCompose}
      />
    );

    expect(screen.getByText(/Failed to load scheduled emails/i)).toBeInTheDocument();
    expect(screen.getByText(/Network connection failure/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders scheduled emails list when data is provided and allows refresh', () => {
    const mockEmails: EmailRecord[] = [
      {
        id: 'email-1',
        recipient: 'test@reachinbox.ai',
        subject: 'Scheduled Outreach',
        body: 'Hello World',
        status: 'SCHEDULED',
        scheduledAt: '2026-10-30T15:00:00.000Z',
        createdAt: '2026-10-30T14:50:00.000Z',
        updatedAt: '2026-10-30T14:50:00.000Z',
      },
    ];

    render(
      <ScheduledTab
        emails={mockEmails}
        isLoading={false}
        error={null}
        onRefresh={mockOnRefresh}
        onComposeClick={mockOnCompose}
      />
    );

    expect(screen.getByText('test@reachinbox.ai')).toBeInTheDocument();
    expect(screen.getByText('Scheduled Outreach')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });
});
