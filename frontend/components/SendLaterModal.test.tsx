import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SendLaterModal } from './SendLaterModal';

describe('SendLaterModal Component (Figma F9)', () => {
  const mockOnClose = vi.fn();
  const mockOnDone = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <SendLaterModal
        isOpen={false}
        onClose={mockOnClose}
        onDone={mockOnDone}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal with quick options, custom date/time, Cancel, and Done', () => {
    render(
      <SendLaterModal
        isOpen={true}
        onClose={mockOnClose}
        onDone={mockOnDone}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Send Later')).toBeInTheDocument();

    // Verify Figma quick options
    expect(screen.getByText('Tomorrow, 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow, 11:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow, 3:00 PM')).toBeInTheDocument();

    // Verify custom inputs
    expect(screen.getByLabelText('Custom Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Custom Time')).toBeInTheDocument();

    // Verify actions
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
  });

  it('clicking a quick option updates the custom time and Done delivers updated ISO', () => {
    render(
      <SendLaterModal
        isOpen={true}
        onClose={mockOnClose}
        onDone={mockOnDone}
      />
    );

    const option3pm = screen.getByText('Tomorrow, 3:00 PM');
    fireEvent.click(option3pm);

    const timeInput = screen.getByLabelText('Custom Time') as HTMLInputElement;
    expect(timeInput.value).toBe('15:00');

    const doneBtn = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneBtn);

    expect(mockOnDone).toHaveBeenCalledTimes(1);
    const chosenIso = mockOnDone.mock.calls[0][0];
    expect(typeof chosenIso).toBe('string');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('clicking Cancel closes the modal without calling onDone', () => {
    render(
      <SendLaterModal
        isOpen={true}
        onClose={mockOnClose}
        onDone={mockOnDone}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnDone).not.toHaveBeenCalled();
  });
});

