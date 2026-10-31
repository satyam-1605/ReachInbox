import React from 'react';
import { Send, AlertCircle, RefreshCw } from 'lucide-react';
import { EmailRecord } from '@/types';
import { EmailRow } from './EmailRow';
import { EmailSkeletonList } from './EmailSkeletonRow';
import { EmptyState } from './ui/EmptyState';
import { Button } from './ui/Button';

export interface SentTabProps {
  emails: EmailRecord[];
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onComposeClick: () => void;
  onSelectEmail?: (email: EmailRecord) => void;
}

export const SentTab: React.FC<SentTabProps> = ({
  emails,
  isLoading,
  error,
  onRefresh,
  onComposeClick,
  onSelectEmail,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs text-gray-400">Loading delivered history...</span>
        </div>
        <EmailSkeletonList count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="sent-error-state"
        className="p-8 bg-rose-50/70 border border-rose-200 rounded-2xl text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-rose-600 mx-auto border border-rose-100 shadow-xs">
          <AlertCircle className="w-6 h-6 text-rose-600" />
        </div>
        <h4 className="text-base font-semibold text-rose-900">Failed to load sent emails</h4>
        <p className="text-xs text-rose-600 max-w-sm mx-auto">{error}</p>
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        title="No sent emails yet"
        description="Once scheduled emails reach their trigger time, the BullMQ worker will deliver them via Ethereal SMTP and log them here."
        icon={Send}
        actionLabel="Schedule First Email"
        onAction={onComposeClick}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs text-gray-500">
          Total delivered: <strong className="text-gray-900">{emails.length}</strong> emails
        </span>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs text-gray-600">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {emails.map((email) => (
          <EmailRow
            key={email.id}
            email={email}
            tab="sent"
            onClick={() => onSelectEmail?.(email)}
          />
        ))}
      </div>
    </div>
  );
};
