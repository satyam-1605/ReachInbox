import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import LoginPage from './page';
import { api } from '@/lib/api';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}));

describe('LoginPage Component (Google OAuth Only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders branding, title, and Google sign-in button', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ user: null });

    await act(async () => {
      render(<LoginPage />);
    });

    expect(screen.getByText('Sign in to ReachInbox')).toBeInTheDocument();
    expect(
      screen.getByText('Email queue scheduler & delivery automation')
    ).toBeInTheDocument();

    const googleBtn = screen.getByTitle('Sign in with Google');
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn).toHaveAttribute('href', api.getGoogleLoginUrl());
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('does not render dummy email/password fields or dashboard link', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ user: null });

    await act(async () => {
      render(<LoginPage />);
    });

    expect(screen.queryByPlaceholderText('name@company.com')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Go to dashboard/i)).not.toBeInTheDocument();
  });

  it('redirects to dashboard if user is already authenticated', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({
      user: {
        id: 'u-1',
        name: 'Alex Johnson',
        email: 'alex@example.com',
        avatar: null,
      },
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});
