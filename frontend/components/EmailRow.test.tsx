import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EmailRow } from './EmailRow';
import { EmailRecord } from '@/types';

describe('EmailRow Component (Figma Design Layout)', () => {
  const mockScheduledEmail: EmailRecord = {
    id: 'email-sched-1',
    recipient: 'partner@growth.io',
    subject: 'Q4 Partnership Opportunity',
    body: '<p>Hi there, let us connect next week to discuss details.</p>',
    status: 'SCHEDULED',
    scheduledAt: '2026-11-01T10:00:00.000Z',
    createdAt: '2026-10-31T08:00:00.000Z',
    updatedAt: '2026-10-31T08:00:00.000Z',
  };

  const mockSentEmail: EmailRecord = {
    id: 'email-sent-1',
    recipient: 'client@enterprise.com',
    subject: 'Product Demo Followup',
    body: 'Thank you for your time today. Here are the slides.',
    status: 'SENT',
    scheduledAt: '2026-10-30T10:00:00.000Z',
    sentAt: '2026-10-30T10:00:02.000Z',
    createdAt: '2026-10-30T09:00:00.000Z',
    updatedAt: '2026-10-30T10:00:02.000Z',
  };

  const mockFailedEmail: EmailRecord = {
    id: 'email-failed-1',
    recipient: 'invalid@bounce.org',
    subject: 'Undelivered Campaign',
    body: 'Sample message',
    status: 'FAILED',
    scheduledAt: '2026-10-30T11:00:00.000Z',
    createdAt: '2026-10-30T09:00:00.000Z',
    updatedAt: '2026-10-30T11:00:05.000Z',
  };

  it('renders scheduled row with "To" label, orange time badge, subject, snippet, and status', () => {
    render(<EmailRow email={mockScheduledEmail} tab="scheduled" />);

    // Recipient & prefix
    expect(screen.getByText('To:')).toBeInTheDocument();
    expect(screen.getByText('partner@growth.io')).toBeInTheDocument();

    // Subject & preview snippet
    expect(screen.getByText('Q4 Partnership Opportunity')).toBeInTheDocument();
    expect(
      screen.getByText(/- Hi there, let us connect next week to discuss details/i)
    ).toBeInTheDocument();

    // Status badge
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
  });

  it('renders sent row with grey "Sent" badge, delivered timestamp, and Ethereal link', () => {
    render(<EmailRow email={mockSentEmail} tab="sent" />);

    expect(screen.getByText('client@enterprise.com')).toBeInTheDocument();
    expect(screen.getByText('Product Demo Followup')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();

    const etherealLink = screen.getByTitle('Open in Ethereal mailbox');
    expect(etherealLink).toBeInTheDocument();
    expect(etherealLink).toHaveAttribute('href', 'https://ethereal.email/messages');
  });

  it('renders red "Failed" badge when email status is FAILED', () => {
    render(<EmailRow email={mockFailedEmail} tab="sent" />);

    expect(screen.getByText('invalid@bounce.org')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('toggles starred state when clicking the star icon', () => {
    render(<EmailRow email={mockScheduledEmail} tab="scheduled" />);

    const starBtn = screen.getByLabelText('Unstarred');
    expect(starBtn).toBeInTheDocument();

    fireEvent.click(starBtn);
    expect(screen.getByLabelText('Starred')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Starred'));
    expect(screen.getByLabelText('Unstarred')).toBeInTheDocument();
  });

  it('triggers onClick handler when clicking row', () => {
    const mockClick = vi.fn();
    render(<EmailRow email={mockScheduledEmail} tab="scheduled" onClick={mockClick} />);

    fireEvent.click(screen.getByText('Q4 Partnership Opportunity'));
    expect(mockClick).toHaveBeenCalledTimes(1);
  });
});

