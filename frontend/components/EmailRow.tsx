import React, { useState } from 'react';
import { Star, Clock, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { EmailRecord } from '@/types';

export interface EmailRowProps {
  email: EmailRecord;
  tab: 'scheduled' | 'sent';
  onClick?: () => void;
}

export const EmailRow: React.FC<EmailRowProps> = ({ email, tab, onClick }) => {
  const [isStarred, setIsStarred] = useState(false);

  // Strip simple HTML tags for clean snippet preview
  const plainBodyPreview = (email.body || '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const formattedScheduledTime = (() => {
    try {
      const date = new Date(email.scheduledAt);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
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
      const date = new Date(email.sentAt);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return email.sentAt;
    }
  })();

  const isScheduledOrPending =
    tab === 'scheduled' ||
    email.status === 'SCHEDULED' ||
    email.status === 'QUEUED' ||
    email.status === 'RESCHEDULED';

  return (
    <div
      onClick={onClick}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-gray-50/90 border border-gray-200 rounded-xl transition-all shadow-none hover:shadow-xs cursor-pointer select-none"
    >
      {/* Left side: Star, "To" label, Status Badge */}
      <div className="flex items-center gap-3 min-w-0 sm:w-2/5">
        {/* Visual Star toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsStarred(!isStarred);
          }}
          className="text-gray-300 hover:text-amber-400 transition-colors shrink-0 p-0.5"
          title={isStarred ? 'Unstar email' : 'Star email'}
          aria-label={isStarred ? 'Starred' : 'Unstarred'}
        >
          <Star
            className={`w-4 h-4 ${
              isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
            }`}
          />
        </button>

        {/* Recipient ("To") */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">
            To:
          </span>
          <span
            className="text-xs font-medium text-gray-900 truncate"
            title={email.recipient}
          >
            {email.recipient}
          </span>
        </div>

        {/* Status / Timing Badge */}
        {isScheduledOrPending ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
              <Clock className="w-3 h-3 text-orange-600" />
              <span>{formattedScheduledTime}</span>
            </span>
            <span className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
              {email.status}
            </span>
          </div>
        ) : email.status === 'FAILED' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Failed</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-gray-500" />
            <span>Sent</span>
          </span>
        )}
      </div>

      {/* Middle: Subject line + preview snippet */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-xs font-semibold text-gray-900 truncate">
          {email.subject || '(No Subject)'}
        </span>
        {plainBodyPreview && (
          <span className="text-xs text-gray-500 truncate hidden md:inline">
            - {plainBodyPreview}
          </span>
        )}
      </div>

      {/* Right side: Timestamp and Actions */}
      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
        {tab === 'sent' && (
          <div className="flex items-center gap-2">
            {formattedSentTime && (
              <span className="text-[11px] text-gray-400">
                {formattedSentTime}
              </span>
            )}
            <a
              href="https://ethereal.email/messages"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:text-primary-700 font-medium px-2 py-0.5 rounded-md hover:bg-primary-50 transition-colors"
              title="Open in Ethereal mailbox"
            >
              <span>Ethereal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        {tab === 'scheduled' && (
          <span className="text-[11px] text-gray-400">
            BullMQ Delayed
          </span>
        )}
      </div>
    </div>
  );
};
