import React from 'react';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User as UserIcon,
  Mail,
  Calendar,
} from 'lucide-react';
import { EmailRecord } from '@/types';

export interface EmailDetailViewProps {
  email: EmailRecord;
  onBack: () => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({ email, onBack }) => {
  const isScheduled =
    email.status === 'SCHEDULED' ||
    email.status === 'QUEUED' ||
    email.status === 'RESCHEDULED';
  const isSent = email.status === 'SENT';
  const isFailed = email.status === 'FAILED';

  const formattedScheduledTime = (() => {
    try {
      const d = new Date(email.scheduledAt);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return email.scheduledAt;
    }
  })();

  const formattedSentTime = (() => {
    if (!email.sentAt) return null;
    try {
      const d = new Date(email.sentAt);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return email.sentAt;
    }
  })();

  return (
    <div
      className="flex flex-col min-h-screen bg-white select-none"
      data-testid="email-detail-view"
    >
      {/* Top Header Bar with Back Button */}
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
          <span className="text-xs font-medium text-gray-500">Back to emails</span>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-2">
          {isScheduled && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span>Scheduled: {formattedScheduledTime}</span>
            </span>
          )}
          {isSent && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Delivered {formattedSentTime ? `at ${formattedSentTime}` : ''}</span>
              </span>
              <a
                href="https://ethereal.email/messages"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors"
              >
                <span>Ethereal Inbox</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Failed</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 sm:p-10 max-w-4xl space-y-6">
        {/* Subject Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            {email.subject || '(No Subject)'}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
              ID: {email.id}
            </span>
          </div>
        </div>

        {/* Sender & Recipient Metadata Card */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-xs font-bold text-primary-700">
                {email.sender?.name?.charAt(0) || 'S'}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">
                  {email.sender?.name || 'Authorized Sender'}
                  <span className="text-gray-500 font-normal ml-1.5">
                    &lt;{email.sender?.email || 'sender@reachinbox.ai'}&gt;
                  </span>
                </p>
                <p className="text-[11px] text-gray-500">
                  To: <strong className="text-gray-800">{email.recipient}</strong>
                </p>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 flex items-center gap-1 sm:self-center">
              <Calendar className="w-3.5 h-3.5" />
              <span>Created {new Date(email.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {email.errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <strong>Error Message:</strong> {email.errorMessage}
            </div>
          )}
        </div>

        {/* Email Body Preview Card */}
        <div className="p-6 sm:p-8 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Message Content
          </h3>
          <div
            className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        </div>
      </div>
    </div>
  );
};

