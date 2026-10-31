import React, { useState, useRef, useId } from 'react';
import { ArrowLeft, Send, UploadCloud, X, Users, AlertCircle, Clock, Paperclip } from 'lucide-react';
import { ComposeToolbar } from './ComposeToolbar';
import { SendLaterModal } from './SendLaterModal';
import { User } from '@/types';
import { api } from '@/lib/api';
import { parseLeadsCsv } from '@/lib/csvParser';

export interface ComposeViewProps {
  user: User | null;
  onBack: () => void;
  onSuccess: (count: number) => void;
  onError: (message: string) => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  user,
  onBack,
  onSuccess,
  onError,
}) => {
  const fileUploadId = useId();
  const [fromEmail, setFromEmail] = useState(user?.email || 'sender@reachinbox.ai');
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [isExpandedChips, setIsExpandedChips] = useState(false);
  const [invalidRowsCount, setInvalidRowsCount] = useState(0);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);

  // Default start time: 2 minutes in future
  const getInitialStartTime = () => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const [scheduledAt, setScheduledAt] = useState(getInitialStartTime());

  const formattedButtonTime = (() => {
    try {
      const d = new Date(scheduledAt);
      if (isNaN(d.getTime())) return 'Pick Time';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Pick Time';
    }
  })();
  const bodyEditorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Attachments state
  interface AttachmentItem {
    id: string;
    name: string;
    size: string;
  }
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: AttachmentItem[] = Array.from(files).map((f, idx) => ({
      id: `${Date.now()}-${idx}-${f.name}`,
      name: f.name,
      size: formatFileSize(f.size),
    }));

    setAttachments((prev) => [...prev, ...newItems]);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (idToRemove: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  // Helper to add emails from raw text (pasted or typed)
  const addEmailsFromText = (rawText: string) => {
    if (!rawText.trim()) return;
    const parsed = parseLeadsCsv(rawText);
    if (parsed.validEmails.length > 0) {
      setRecipientEmails((prev) => {
        const combined = new Set([...prev, ...parsed.validEmails]);
        return Array.from(combined);
      });
      if (parsed.invalidRows.length > 0) {
        setInvalidRowsCount((prev) => prev + parsed.invalidRows.length);
      }
      setManualInput('');
    }
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseLeadsCsv(content);
        setRecipientEmails((prev) => {
          const combined = new Set([...prev, ...parsed.validEmails]);
          return Array.from(combined);
        });
        setInvalidRowsCount(parsed.invalidRows.length);
      }
    };
    reader.readAsText(file);
    // Reset file input so user can re-upload if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove a single email chip
  const handleRemoveChip = (emailToRemove: string) => {
    setRecipientEmails((prev) => prev.filter((email) => email !== emailToRemove));
  };

  // Keyboard navigation for typing in "To" field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmailsFromText(manualInput);
    } else if (e.key === 'Backspace' && !manualInput && recipientEmails.length > 0) {
      // Remove last chip on backspace if input is empty
      setRecipientEmails((prev) => prev.slice(0, prev.length - 1));
    }
  };

  // Formatting toolbar action using visual WYSIWYG execCommand
  const handleFormat = (command: string) => {
    const editor = bodyEditorRef.current;
    if (!editor) return;
    editor.focus();

    if (typeof window !== 'undefined') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }

    if (typeof document !== 'undefined') {
      try {
        switch (command) {
          case 'bold':
            document.execCommand('bold', false);
            break;
          case 'italic':
            document.execCommand('italic', false);
            break;
          case 'underline':
            document.execCommand('underline', false);
            break;
          case 'strike':
            document.execCommand('strikeThrough', false);
            break;
          case 'left':
            document.execCommand('justifyLeft', false);
            break;
          case 'center':
            document.execCommand('justifyCenter', false);
            break;
          case 'right':
            document.execCommand('justifyRight', false);
            break;
          case 'bullet':
            document.execCommand('insertUnorderedList', false);
            break;
          case 'numbered':
            document.execCommand('insertOrderedList', false);
            break;
          case 'link': {
            const selection = window.getSelection();
            const selectedText = selection ? selection.toString() : '';
            const url =
              typeof window !== 'undefined' && window.prompt
                ? window.prompt('Enter link URL (e.g. https://example.com):', 'https://')
                : 'https://example.com';
            if (!url) break;

            if (selectedText && selectedText.trim().length > 0) {
              document.execCommand('createLink', false, url);
            } else {
              const text =
                (typeof window !== 'undefined' && window.prompt
                  ? window.prompt('Enter link text:', url)
                  : url) || url;
              const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>&nbsp;`;
              document.execCommand('insertHTML', false, linkHtml);
            }
            break;
          }
          default:
            break;
        }
      } catch {
        // Fallback for environments where execCommand is restricted
      }
    }

    setBody(editor.innerHTML || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      onError('Subject is required');
      return;
    }

    const htmlContent = bodyEditorRef.current ? bodyEditorRef.current.innerHTML : body;
    const textContent = bodyEditorRef.current
      ? (bodyEditorRef.current.innerText || bodyEditorRef.current.textContent || '')
      : body;

    if (!textContent.trim() && !htmlContent.trim()) {
      onError('Email body is required');
      return;
    }

    // Include any pending manual input
    let finalEmails = [...recipientEmails];
    if (manualInput.trim()) {
      const parsed = parseLeadsCsv(manualInput);
      finalEmails = Array.from(new Set([...finalEmails, ...parsed.validEmails]));
    }

    if (finalEmails.length === 0) {
      onError('Please provide at least one valid recipient lead email');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledIso = new Date(scheduledAt).toISOString();
      const res = await api.scheduleEmails({
        recipients: finalEmails,
        subject,
        body: htmlContent,
        startTime: scheduledIso,
        scheduledAt: scheduledIso,
        delayBetweenEmailsMs: Math.max(0, delaySeconds) * 1000,
        hourlyLimit: Math.max(1, hourlyLimit),
        userId: user?.id,
      });

      onSuccess(res.count);
      onBack();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule campaign';
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine which chips to show
  const visibleChips =
    recipientEmails.length <= 3 || isExpandedChips
      ? recipientEmails
      : recipientEmails.slice(0, 3);
  const hiddenCount = recipientEmails.length - visibleChips.length;

  return (
    <div className="flex flex-col min-h-screen bg-white" data-testid="compose-full-page">
      {/* Top Header Bar with Back Button & Actions */}
      <div className="h-16 px-6 sm:px-8 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title="Back to emails"
            aria-label="Back to emails"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900">
              New Campaign
            </h1>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              Schedule automated delayed email sequences
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Send Later Button (Figma F9) */}
          <button
            type="button"
            onClick={() => setIsSendLaterOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors shadow-2xs"
            title="Pick scheduled send time"
          >
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span>Send Later: {formattedButtonTime}</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 rounded-xl transition-all shadow-sm hover:shadow"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Scheduling...' : 'Schedule Campaign'}</span>
          </button>
        </div>
      </div>

      {/* Main Compose Form Fields Container */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 max-w-4xl space-y-5">
        {/* Row 1: From & To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* From Field */}
          <div>
            <div className="flex items-center justify-between h-8 mb-1.5">
              <label className="text-xs font-semibold text-gray-700">
                From
              </label>
            </div>
            <input
              type="text"
              aria-label="From"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="sender@domain.com"
              className="w-full h-11 px-3.5 text-xs sm:text-sm bg-gray-50/80 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-medium"
            />
          </div>

          {/* To Field with Upload List & Email Chips */}
          <div>
            <div className="flex items-center justify-between h-8 mb-1.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="manual-lead-input"
                  className="text-xs font-semibold text-gray-700"
                >
                  To
                </label>
                {/* Detected Lead Count Badge */}
                {recipientEmails.length > 0 && (
                  <span
                    data-testid="lead-count-badge"
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-50 text-primary-700 border border-primary-200"
                  >
                    {recipientEmails.length} email
                    {recipientEmails.length === 1 ? '' : 's'} detected
                  </span>
                )}
              </div>

              {/* Upload List Button */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  id={fileUploadId}
                  data-testid="upload-list-input"
                  aria-label="Upload List file"
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor={fileUploadId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg cursor-pointer transition-colors"
                  title="Upload CSV or TXT lead list"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-primary-600" />
                  <span>Upload List</span>
                </label>
                {recipientEmails.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientEmails([]);
                      setInvalidRowsCount(0);
                    }}
                    className="text-[11px] text-gray-400 hover:text-rose-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Chips & Text input container */}
            <div
              className="min-h-[44px] px-3 py-1.5 flex flex-wrap items-center gap-1.5 bg-white border border-gray-200 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all"
              onClick={() => {
                // Focus the manual input when clicking container
                const input = document.getElementById('manual-lead-input');
                if (input) input.focus();
              }}
            >
              {/* Render Visible Email Chips */}
              {visibleChips.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 shrink-0"
                >
                  <span className="truncate max-w-[180px]">{email}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveChip(email);
                    }}
                    className="text-gray-400 hover:text-gray-700 p-0.5"
                    title={`Remove ${email}`}
                    aria-label={`Remove ${email}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* +N More Badge */}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpandedChips(true);
                  }}
                  className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors"
                  title="Click to expand all emails"
                >
                  +{hiddenCount} more
                </button>
              )}

              {/* Inline Input for Manual Typing & Paste */}
              <input
                id="manual-lead-input"
                type="text"
                aria-label="To"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (manualInput.trim()) {
                    addEmailsFromText(manualInput);
                  }
                }}
                placeholder={
                  recipientEmails.length === 0
                    ? 'Paste emails or type and hit Enter...'
                    : ''
                }
                className="flex-1 min-w-[160px] px-2 py-1 text-xs sm:text-sm text-gray-900 bg-transparent outline-none placeholder-gray-400"
              />
            </div>

            {/* Invalid rows notice */}
            {invalidRowsCount > 0 && (
              <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{invalidRowsCount} invalid or blank row(s) safely ignored</span>
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Subject */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Subject
          </label>
          <input
            type="text"
            aria-label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Introduce your solution or quick touchpoint..."
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-medium"
            required
          />
        </div>

        {/* Row 3: Concurrency, Delay & Hourly Limit (Assignment Controls) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50/70 border border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Delay between 2 emails (s)
            </label>
            <input
              type="number"
              aria-label="Delay between 2 emails"
              min={0}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-primary-500"
            />
            <p className="text-[10px] text-gray-500 mt-1">Inter-email gap</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Hourly Limit (per sender)
            </label>
            <input
              type="number"
              aria-label="Hourly Limit"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-primary-500"
            />
            <p className="text-[10px] text-gray-500 mt-1">Slack alert on limit</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              First Send Start Time
            </label>
            <input
              type="datetime-local"
              aria-label="First Send Start Time"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-primary-500"
            />
            <p className="text-[10px] text-gray-500 mt-1">BullMQ delay start</p>
          </div>
        </div>

        {/* Row 4: Body with Formatting Toolbar */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Body Editor
          </label>
          <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all bg-white">
            <ComposeToolbar
              onFormat={handleFormat}
              onAttach={() => attachmentInputRef.current?.click()}
            />
            <div
              ref={bodyEditorRef}
              contentEditable
              role="textbox"
              aria-label="Body Editor"
              aria-multiline="true"
              data-testid="body-editor"
              onInput={(e) => {
                setBody(e.currentTarget.innerHTML);
              }}
              onBlur={(e) => {
                setBody(e.currentTarget.innerHTML);
              }}
              className="w-full p-4 text-xs sm:text-sm text-gray-900 bg-white outline-none min-h-[220px] max-h-[480px] overflow-y-auto leading-relaxed focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
              data-placeholder="Write your email pitch or rich HTML message here..."
            />
            {/* Hidden Attachment File Input */}
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              aria-label="Attach files input"
              data-testid="attach-file-input"
              className="hidden"
              onChange={handleAttachmentChange}
            />
          </div>

          {/* Attached Files List Display */}
          {attachments.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2" data-testid="attached-files-list">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-gray-100 text-gray-800 border border-gray-200"
                >
                  <Paperclip className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="font-medium truncate max-w-[200px]" title={att.name}>
                    {att.name}
                  </span>
                  <span className="text-[11px] text-gray-400">({att.size})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-0.5 text-gray-400 hover:text-rose-600 transition-colors"
                    title={`Remove ${att.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Send Later Popup Picker (Figma F9) */}
      <SendLaterModal
        isOpen={isSendLaterOpen}
        initialTime={scheduledAt}
        onClose={() => setIsSendLaterOpen(false)}
        onDone={(newIso) => setScheduledAt(newIso)}
      />
    </div>
  );
};
