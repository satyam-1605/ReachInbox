import React from 'react';
import { Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { EmailRecord } from '@/types';
import { EmailRow } from './EmailRow';
import { EmailSkeletonList } from './EmailSkeletonRow';
import { EmptyState } from './ui/EmptyState';
import { Button } from './ui/Button';

export interface ScheduledTabProps {
  emails: EmailRecord[];
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onComposeClick: () => void;
  onSelectEmail?: (email: EmailRecord) => void;
}

export const ScheduledTab: React.FC<ScheduledTabProps> = ({
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
          <span className="text-xs text-gray-400">Loading scheduled queue...</span>
        </div>
        <EmailSkeletonList count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="scheduled-error-state"
        className="p-8 bg-rose-50/70 border border-rose-200 rounded-2xl text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-rose-600 mx-auto border border-rose-100 shadow-xs">
          <AlertCircle className="w-6 h-6 text-rose-600" />
        </div>
        <h4 className="text-base font-semibold text-rose-900">Failed to load scheduled emails</h4>
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
        title="No scheduled emails"
        description="You have no emails waiting in the delayed BullMQ queue. Schedule a new campaign now."
        icon={Calendar}
        actionLabel="Compose Email"
        onAction={onComposeClick}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs text-gray-500">
          Showing <strong className="text-gray-800">{emails.length}</strong> scheduled jobs
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
            tab="scheduled"
            onClick={() => onSelectEmail?.(email)}
          />
        ))}
      </div>
    </div>
  );
};
