import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Toast } from './Toast';

describe('Toast Component (Figma Light Theme Polish)', () => {
  it('renders success toast with message and dismiss action', () => {
    const mockClose = vi.fn();
    render(
      <Toast
        type="success"
        message="Campaign scheduled successfully"
        onClose={mockClose}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Campaign scheduled successfully')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('Dismiss toast');
    fireEvent.click(dismissBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('renders error toast with appropriate styling', () => {
    render(<Toast type="error" message="Network error occurred" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('border-rose-200');
  });

  it('renders info toast by default', () => {
    render(<Toast message="Informative system notice" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Informative system notice')).toBeInTheDocument();
  });
});

