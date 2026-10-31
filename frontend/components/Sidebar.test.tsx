import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Sidebar } from './Sidebar';
import { User, SlackStatus } from '@/types';

describe('Sidebar Component (Figma App Shell & User Card Dropdown)', () => {
  const mockOnTabChange = vi.fn();
  const mockOnCompose = vi.fn();
  const mockOnLogout = vi.fn();
  const mockOnSlackConnect = vi.fn();

  const mockUser: User = {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'alex@reachinbox.ai',
    avatar: null,
  };

  const mockSlackConnected: SlackStatus = {
    connected: true,
    teamName: 'ReachInbox Workspace',
    channel: 'alerts',
  };

  const mockSlackDisconnected: SlackStatus = {
    connected: false,
  };

  it('renders branding, compose button, and navigation items with correct counts', () => {
    render(
      <Sidebar
        user={mockUser}
        slackStatus={mockSlackConnected}
        activeTab="scheduled"
        onTabChange={mockOnTabChange}
        scheduledCount={5}
        sentCount={12}
        onComposeClick={mockOnCompose}
        onLogout={mockOnLogout}
        onSlackConnect={mockOnSlackConnect}
      />
    );

    expect(screen.getByText('ReachInbox')).toBeInTheDocument();
    expect(screen.getByText('Compose')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('handles navigation tab changes when clicking Scheduled or Sent', () => {
    render(
      <Sidebar
        user={mockUser}
        slackStatus={mockSlackConnected}
        activeTab="scheduled"
        onTabChange={mockOnTabChange}
        scheduledCount={3}
        sentCount={7}
        onComposeClick={mockOnCompose}
        onLogout={mockOnLogout}
        onSlackConnect={mockOnSlackConnect}
      />
    );

    fireEvent.click(screen.getByText('Sent'));
    expect(mockOnTabChange).toHaveBeenCalledWith('sent');

    fireEvent.click(screen.getByText('Scheduled'));
    expect(mockOnTabChange).toHaveBeenCalledWith('scheduled');
  });

  it('triggers onComposeClick when clicking the Compose button', () => {
    render(
      <Sidebar
        user={mockUser}
        slackStatus={mockSlackConnected}
        activeTab="scheduled"
        onTabChange={mockOnTabChange}
        scheduledCount={0}
        sentCount={0}
        onComposeClick={mockOnCompose}
        onLogout={mockOnLogout}
        onSlackConnect={mockOnSlackConnect}
      />
    );

    fireEvent.click(screen.getByText('Compose'));
    expect(mockOnCompose).toHaveBeenCalledTimes(1);
  });

  it('renders user details and toggles user dropdown menu', () => {
    render(
      <Sidebar
        user={mockUser}
        slackStatus={mockSlackConnected}
        activeTab="scheduled"
        onTabChange={mockOnTabChange}
        scheduledCount={0}
        sentCount={0}
        onComposeClick={mockOnCompose}
        onLogout={mockOnLogout}
        onSlackConnect={mockOnSlackConnect}
      />
    );

    // Initial render shows user name and email on the card
    expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
    expect(screen.getByText('alex@reachinbox.ai')).toBeInTheDocument();

    // Dropdown should be initially closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Clicking the user card button opens the dropdown
    const userCardButton = screen.getByTitle('User options');
    fireEvent.click(userCardButton);

    // Dropdown menu should now be open
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Google Account')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();

    // Clicking again closes the dropdown
    fireEvent.click(userCardButton);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls onLogout and closes menu when clicking Log out inside the dropdown', () => {
    render(
      <Sidebar
        user={mockUser}
        slackStatus={mockSlackConnected}
        activeTab="scheduled"
        onTabChange={mockOnTabChange}
        scheduledCount={0}
        sentCount={0}
        onComposeClick={mockOnCompose}
        onLogout={mockOnLogout}
        onSlackConnect={mockOnSlackConnect}
      />
    );

    // Open dropdown
    const userCardButton = screen.getByTitle('User options');
    fireEvent.click(userCardButton);

    // Click Log out
    const logoutBtn = screen.getByText('Log out');
    fireEvent.click(logoutBtn);

    expect(mockOnLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders Google Login button when user is not logged in', () => {
    render(
      <Sidebar
        user={null}
        slackStatus={mockSlackDisconnected}
        activeTab="scheduled"
        onTabChange={mockOnTabChange}
        scheduledCount={0}
        sentCount={0}
        onComposeClick={mockOnCompose}
        onLogout={mockOnLogout}
        onSlackConnect={mockOnSlackConnect}
      />
    );

    expect(screen.getByText('Login with Google')).toBeInTheDocument();
    expect(screen.queryByTitle('User options')).not.toBeInTheDocument();
  });

  it('renders Slack connected badge when connected, and connect button when disconnected', () => {
    const { rerender } = render(
      <Sidebar
        user={mockUser}
        slackStatus={mockSlackConnected}
        activeTab="scheduled"
        onTabChange={mockOnTabChange}
        scheduledCount={0}
        sentCount={0}
        onComposeClick={mockOnCompose}
        onLogout={mockOnLogout}
        onSlackConnect={mockOnSlackConnect}
      />
    );

    expect(screen.getByText('Slack Connected')).toBeInTheDocument();

    rerender(
      <Sidebar
        user={mockUser}
        slackStatus={mockSlackDisconnected}
        activeTab="scheduled"
        onTabChange={mockOnTabChange}
        scheduledCount={0}
        sentCount={0}
        onComposeClick={mockOnCompose}
        onLogout={mockOnLogout}
        onSlackConnect={mockOnSlackConnect}
      />
    );

    const slackBtn = screen.getByTitle('Connect Slack for rate limit alerts');
    expect(slackBtn).toBeInTheDocument();
    fireEvent.click(slackBtn);
    expect(mockOnSlackConnect).toHaveBeenCalledTimes(1);
  });
});
