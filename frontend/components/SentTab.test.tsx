import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SentTab } from './SentTab';
import { EmailRecord } from '@/types';

describe('SentTab States (Skeleton Loading, Empty, Error, Data, Refresh)', () => {
  const mockOnRefresh = vi.fn();
  const mockOnCompose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton shimmer loading rows when isLoading is true', () => {
    render(
      <SentTab
        emails={[]}
        isLoading={true}
        error={null}
        onRefresh={mockOnRefresh}
        onComposeClick={mockOnCompose}
      />
    );

    expect(screen.getByText(/Loading delivered history/i)).toBeInTheDocument();
    expect(screen.getByTestId('email-skeleton-list')).toBeInTheDocument();
    const rows = screen.getAllByTestId('email-skeleton-row');
    expect(rows.length).toBe(5);
  });

  it('renders Figma empty state when sent list is empty', () => {
    render(
      <SentTab
        emails={[]}
        isLoading={false}
        error={null}
        onRefresh={mockOnRefresh}
        onComposeClick={mockOnCompose}
      />
    );

    expect(screen.getByText(/No sent emails yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Schedule First Email/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Schedule First Email/i));
    expect(mockOnCompose).toHaveBeenCalledTimes(1);
  });

  it('renders error banner with retry button when error is provided', () => {
    render(
      <SentTab
        emails={[]}
        isLoading={false}
        error="Failed to connect to database"
        onRefresh={mockOnRefresh}
        onComposeClick={mockOnCompose}
      />
    );

    expect(screen.getByText(/Failed to load sent emails/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to connect to database/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders delivered emails list when data is provided and allows refresh', () => {
    const mockEmails: EmailRecord[] = [
      {
        id: 'email-sent-1',
        recipient: 'customer@client.com',
        subject: 'Invoice #1024',
        body: 'Here is your receipt',
        status: 'SENT',
        scheduledAt: '2026-10-30T10:00:00.000Z',
        sentAt: '2026-10-30T10:00:03.000Z',
        createdAt: '2026-10-30T09:00:00.000Z',
        updatedAt: '2026-10-30T10:00:03.000Z',
      },
    ];

    render(
      <SentTab
        emails={mockEmails}
        isLoading={false}
        error={null}
        onRefresh={mockOnRefresh}
        onComposeClick={mockOnCompose}
      />
    );

    expect(screen.getByText('customer@client.com')).toBeInTheDocument();
    expect(screen.getByText('Invoice #1024')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });
});
