import React, { useState, useId } from 'react';
import { UploadCloud, Users, Clock, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { parseLeadsCsv } from '@/lib/csvParser';
import { api } from '@/lib/api';

export interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  onError: (message: string) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const fileInputId = useId();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [rawRecipients, setRawRecipients] = useState('');
  const [validEmails, setValidEmails] = useState<string[]>([]);
  const [invalidRows, setInvalidRows] = useState<string[]>([]);
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default start time: 2 minutes in future
  const getInitialStartTime = () => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const [startTime, setStartTime] = useState(getInitialStartTime());

  const handleCsvTextChange = (text: string) => {
    setRawRecipients(text);
    const parsed = parseLeadsCsv(text);
    setValidEmails(parsed.validEmails);
    setInvalidRows(parsed.invalidRows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleCsvTextChange(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      onError('Subject is required');
      return;
    }
    if (!body.trim()) {
      onError('Email body is required');
      return;
    }
    if (validEmails.length === 0) {
      onError('Please provide at least one valid recipient lead email');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledIso = new Date(startTime).toISOString();
      const res = await api.scheduleEmails({
        recipients: validEmails,
        subject,
        body,
        scheduledAt: scheduledIso,
        delayBetweenEmailsMs: delaySeconds * 1000,
        hourlyLimit,
      });

      onSuccess(res.count);
      onClose();
      setSubject('');
      setBody('');
      setRawRecipients('');
      setValidEmails([]);
      setInvalidRows([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule emails';
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose Scheduled Campaign"
      description="Queue emails with BullMQ delayed timing, custom rate limits, and Ethereal delivery."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject */}
        <Input
          label="Subject Line"
          placeholder="e.g. Introducing our new automated scheduling system"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Email Body (Text or HTML)
          </label>
          <textarea
            rows={4}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            placeholder="Hi {{name}}, we are excited to reach out..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        {/* CSV Leads Upload & Manual Entry */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor={fileInputId} className="text-xs font-medium text-gray-700">
              Recipient Leads (CSV or paste emails)
            </label>
            <div className="flex items-center gap-2">
              <input
                id={fileInputId}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
              <label
                htmlFor={fileInputId}
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload CSV</span>
              </label>
            </div>
          </div>

          <textarea
            rows={3}
            className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            placeholder="alex@example.com, sam@reachinbox.ai, or paste CSV content"
            value={rawRecipients}
            onChange={(e) => handleCsvTextChange(e.target.value)}
          />

          {/* Lead parsing summary */}
          <div className="mt-2 flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Users className="w-3.5 h-3.5 text-primary-600" />
              <span>
                Valid leads: <strong className="text-primary-700">{validEmails.length}</strong>
              </span>
            </div>
            {invalidRows.length > 0 && (
              <span className="text-amber-700 text-[11px] font-medium">
                {invalidRows.length} invalid {invalidRows.length === 1 ? 'row' : 'rows'} ignored
              </span>
            )}
          </div>
        </div>

        {/* Schedule Timing & Rate Limit Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Start Time</span>
            </label>
            <input
              type="datetime-local"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              type="number"
              min={1}
              label="Delay between sends (sec)"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              helperText="Min gap in ms"
            />
          </div>

          <div>
            <Input
              type="number"
              min={1}
              label="Hourly Limit (emails/hr)"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              helperText="Auto-reschedules excess"
            />
          </div>
        </div>

        {/* Rate limit note */}
        <div className="flex items-start gap-2 p-3 bg-primary-50 border border-primary-200 rounded-xl text-xs text-primary-800">
          <Sparkles className="w-4 h-4 mt-0.5 text-primary-600 flex-shrink-0" />
          <span>
            If the hourly limit is exceeded, BullMQ automatically pushes excess jobs to the start of the next hour window and triggers a Slack alert. Zero dropped emails.
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={validEmails.length === 0}
          >
            Schedule {validEmails.length > 0 ? `${validEmails.length} Emails` : 'Campaign'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
