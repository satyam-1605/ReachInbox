import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ComposeView } from './ComposeView';
import { api } from '@/lib/api';

describe('ComposeView Component (Figma F7 & F8 Specification)', () => {
  const mockOnBack = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  const mockUser = {
    id: 'u-1',
    name: 'Sarah Connor',
    email: 'sarah@reachinbox.ai',
    avatar: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders full page layout with back arrow, heading, and all required fields', () => {
    render(
      <ComposeView
        user={mockUser}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByTestId('compose-full-page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to emails/i })).toBeInTheDocument();
    expect(screen.getByText('New Campaign')).toBeInTheDocument();

    // Verify all 5 key fields specified in Figma F7
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Delay between 2 emails')).toBeInTheDocument();
    expect(screen.getByLabelText('Hourly Limit')).toBeInTheDocument();
    expect(screen.getByLabelText('Body Editor')).toBeInTheDocument();
    expect(screen.getByText('Upload List')).toBeInTheDocument();
  });

  it('fields hold and update values on user input', () => {
    render(
      <ComposeView
        user={mockUser}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const fromInput = screen.getByLabelText('From') as HTMLInputElement;
    const toInput = screen.getByLabelText('To') as HTMLInputElement;
    const subjectInput = screen.getByLabelText('Subject') as HTMLInputElement;
    const delayInput = screen.getByLabelText('Delay between 2 emails') as HTMLInputElement;
    const limitInput = screen.getByLabelText('Hourly Limit') as HTMLInputElement;
    const bodyInput = screen.getByLabelText('Body Editor') as HTMLElement;

    expect(fromInput.value).toBe('sarah@reachinbox.ai');

    // Type email in "To" field and hit Enter to create a chip
    fireEvent.change(toInput, { target: { value: 'lead@enterprise.com' } });
    fireEvent.keyDown(toInput, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('lead@enterprise.com')).toBeInTheDocument();

    fireEvent.change(subjectInput, { target: { value: 'Demo meeting next week' } });
    expect(subjectInput.value).toBe('Demo meeting next week');

    fireEvent.change(delayInput, { target: { value: '5' } });
    expect(delayInput.value).toBe('5');

    fireEvent.change(limitInput, { target: { value: '10' } });
    expect(limitInput.value).toBe('10');

    fireEvent.input(bodyInput, { target: { innerHTML: 'Hello client, checking in.' } });
    expect(bodyInput.innerHTML).toBe('Hello client, checking in.');
  });

  it('Upload List parses CSV, removes duplicates, ignores bad rows, and shows detected count (F8)', async () => {
    render(
      <ComposeView
        user={mockUser}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const sampleCsvContent = `email,name
alice@reachinbox.ai,Alice
bob@reachinbox.ai,Bob
alice@reachinbox.ai,Alice Duplicate
invalid-email-address,Bad Row
charlie@reachinbox.ai,Charlie
diana@reachinbox.ai,Diana
`;

    const file = new File([sampleCsvContent], 'leads.csv', { type: 'text/csv' });
    const fileInput = screen.getByTestId('upload-list-input') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for FileReader
    await waitFor(() => {
      // 4 unique valid emails: alice, bob, charlie, diana
      expect(screen.getByText('4 emails detected')).toBeInTheDocument();
    });

    // Check that chips are rendered
    expect(screen.getByText('alice@reachinbox.ai')).toBeInTheDocument();
    expect(screen.getByText('bob@reachinbox.ai')).toBeInTheDocument();
    expect(screen.getByText('charlie@reachinbox.ai')).toBeInTheDocument();

    // Verify +1 more badge for the 4th email
    expect(screen.getByText('+1 more')).toBeInTheDocument();

    // Clicking +1 more expands all chips
    fireEvent.click(screen.getByText('+1 more'));
    expect(screen.getByText('diana@reachinbox.ai')).toBeInTheDocument();

    // Removing a chip updates the count
    const removeBtn = screen.getByLabelText('Remove diana@reachinbox.ai');
    fireEvent.click(removeBtn);
    expect(screen.queryByText('diana@reachinbox.ai')).not.toBeInTheDocument();
    expect(screen.getByText('3 emails detected')).toBeInTheDocument();
  });

  it('navigates back to the email list when clicking back arrow or discard', () => {
    render(
      <ComposeView
        user={mockUser}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const backBtn = screen.getByRole('button', { name: /Back to emails/i });
    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(1);

    const discardBtn = screen.getByRole('button', { name: /Discard/i });
    fireEvent.click(discardBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(2);
  });

  it('applies formatting tags from toolbar into the body editor', () => {
    const execMock = vi.fn().mockReturnValue(true);
    document.execCommand = execMock;

    render(
      <ComposeView
        user={mockUser}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const boldBtn = screen.getByRole('button', { name: 'Bold' });
    fireEvent.click(boldBtn);
    expect(execMock).toHaveBeenCalledWith('bold', false);

    const bulletBtn = screen.getByRole('button', { name: 'Bullet List' });
    fireEvent.click(bulletBtn);
    expect(execMock).toHaveBeenCalledWith('insertUnorderedList', false);

    const numberedBtn = screen.getByRole('button', { name: 'Numbered List' });
    fireEvent.click(numberedBtn);
    expect(execMock).toHaveBeenCalledWith('insertOrderedList', false);
  });

  it('attaches files via toolbar attach button and displays attachment chip', () => {
    render(
      <ComposeView
        user={mockUser}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const attachInput = screen.getByTestId('attach-file-input') as HTMLInputElement;
    const testFile = new File(['test document content'], 'contract.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(attachInput, { target: { files: [testFile] } });

    expect(screen.getByText('contract.pdf')).toBeInTheDocument();

    const removeBtn = screen.getByTitle('Remove contract.pdf');
    fireEvent.click(removeBtn);
    expect(screen.queryByText('contract.pdf')).not.toBeInTheDocument();
  });

  it('submits valid campaign data and triggers onSuccess', async () => {
    vi.spyOn(api, 'scheduleEmails').mockResolvedValue({
      message: 'Emails scheduled',
      count: 2,
      emails: [],
    });

    render(
      <ComposeView
        user={mockUser}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    // Add recipient leads
    const toInput = screen.getByLabelText('To') as HTMLInputElement;
    fireEvent.change(toInput, { target: { value: 'a@test.com' } });
    fireEvent.keyDown(toInput, { key: 'Enter', code: 'Enter' });

    fireEvent.change(toInput, { target: { value: 'b@test.com' } });
    fireEvent.keyDown(toInput, { key: 'Enter', code: 'Enter' });

    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Test Subject' },
    });
    fireEvent.input(screen.getByLabelText('Body Editor'), {
      target: { innerHTML: '<p>Test Body Content</p>' },
    });

    const submitBtn = screen.getByRole('button', { name: /Schedule Campaign/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.scheduleEmails).toHaveBeenCalledTimes(1);
      expect(mockOnSuccess).toHaveBeenCalledWith(2);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  it('opens Send Later popup and chosen time updates the Send Later button (F9)', async () => {
    render(
      <ComposeView
        user={mockUser}
        onBack={mockOnBack}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const sendLaterBtn = screen.getByTitle('Pick scheduled send time');
    expect(sendLaterBtn).toBeInTheDocument();

    // Click Send Later button to open popup
    fireEvent.click(sendLaterBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Pick 3:00 PM preset
    const presetBtn = screen.getByText('Tomorrow, 3:00 PM');
    fireEvent.click(presetBtn);

    // Click Done
    const doneBtn = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneBtn);

    // Modal should close and button text should reflect 3:00 PM (or 15:00)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sendLaterBtn.textContent).toMatch(/3:00|15:00/i);
  });
});
