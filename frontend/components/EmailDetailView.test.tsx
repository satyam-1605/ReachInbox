import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EmailDetailView } from './EmailDetailView';
import { EmailRecord } from '@/types';

describe('EmailDetailView Component (Figma F11)', () => {
  const mockOnBack = vi.fn();

  const mockScheduledEmail: EmailRecord = {
    id: 'email-101',
    recipient: 'prospect@acme.com',
    subject: 'Partnership Inquiry for Q4',
    body: '<p>Hello team, let us meet next Tuesday to align goals.</p>',
    status: 'SCHEDULED',
    scheduledAt: '2026-11-02T10:00:00.000Z',
    createdAt: '2026-10-31T08:00:00.000Z',
    updatedAt: '2026-10-31T08:00:00.000Z',
    sender: {
      id: 'sender-1',
      name: 'Alex Johnson',
      email: 'alex@reachinbox.ai',
    },
  };

  const mockSentEmail: EmailRecord = {
    id: 'email-102',
    recipient: 'client@enterprise.org',
    subject: 'Product Update Delivered',
    body: 'The scheduled campaign has finished successfully.',
    status: 'SENT',
    scheduledAt: '2026-10-30T10:00:00.000Z',
    sentAt: '2026-10-30T10:00:05.000Z',
    createdAt: '2026-10-30T09:00:00.000Z',
    updatedAt: '2026-10-30T10:00:05.000Z',
  };

  const mockFailedEmail: EmailRecord = {
    id: 'email-103',
    recipient: 'bounced@invalid.org',
    subject: 'Failed Campaign Attempt',
    body: 'Sample message',
    status: 'FAILED',
    errorMessage: 'SMTP connection timeout on port 587',
    scheduledAt: '2026-10-30T12:00:00.000Z',
    createdAt: '2026-10-30T09:00:00.000Z',
    updatedAt: '2026-10-30T12:00:05.000Z',
  };

  it('renders scheduled email subject, sender, recipient, orange timing badge, and body', () => {
    render(<EmailDetailView email={mockScheduledEmail} onBack={mockOnBack} />);

    expect(screen.getByTestId('email-detail-view')).toBeInTheDocument();
    expect(screen.getByText('Partnership Inquiry for Q4')).toBeInTheDocument();
    expect(screen.getByText('prospect@acme.com')).toBeInTheDocument();
    expect(screen.getByText(/Alex Johnson/i)).toBeInTheDocument();
    expect(screen.getByText(/Scheduled:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Hello team, let us meet next Tuesday to align goals./i)
    ).toBeInTheDocument();
  });

  it('renders sent email with delivered status and Ethereal mailbox link', () => {
    render(<EmailDetailView email={mockSentEmail} onBack={mockOnBack} />);

    expect(screen.getByText('Product Update Delivered')).toBeInTheDocument();
    expect(screen.getByText(/Delivered at/i)).toBeInTheDocument();

    const etherealLink = screen.getByRole('link', { name: /Ethereal Inbox/i });
    expect(etherealLink).toBeInTheDocument();
    expect(etherealLink).toHaveAttribute('href', 'https://ethereal.email/messages');
  });

  it('renders failed email with error message notice', () => {
    render(<EmailDetailView email={mockFailedEmail} onBack={mockOnBack} />);

    expect(screen.getByText('Failed Campaign Attempt')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(
      screen.getByText(/SMTP connection timeout on port 587/i)
    ).toBeInTheDocument();
  });

  it('clicking back button calls onBack handler', () => {
    render(<EmailDetailView email={mockScheduledEmail} onBack={mockOnBack} />);

    const backBtn = screen.getByRole('button', { name: /Back to emails/i });
    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});
