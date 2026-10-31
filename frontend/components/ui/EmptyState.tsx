import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50"
    >
      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-gray-500 mb-4 border border-gray-200 shadow-sm">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
