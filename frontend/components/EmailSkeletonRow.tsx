import React from 'react';

export interface EmailSkeletonRowProps {
  count?: number;
}

export const EmailSkeletonRow: React.FC<{ 'data-testid'?: string }> = ({
  'data-testid': testId = 'email-skeleton-row',
}) => {
  return (
    <div
      data-testid={testId}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 bg-white border border-gray-200 rounded-xl animate-pulse select-none"
    >
      {/* Left side: Star, Recipient, Badge placeholders */}
      <div className="flex items-center gap-3 min-w-0 sm:w-2/5">
        <div className="w-4 h-4 bg-gray-200 rounded shrink-0" />
        <div className="w-5 h-3 bg-gray-200 rounded shrink-0" />
        <div className="w-28 sm:w-36 h-3.5 bg-gray-200 rounded" />
        <div className="w-20 h-4.5 bg-orange-50/60 border border-orange-100 rounded-full shrink-0" />
      </div>

      {/* Middle: Subject line & preview snippet placeholders */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="w-40 sm:w-52 h-3.5 bg-gray-200 rounded" />
        <div className="w-64 h-3 bg-gray-100 rounded hidden md:block" />
      </div>

      {/* Right side: Timestamp placeholder */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <div className="w-20 h-3 bg-gray-100 rounded" />
      </div>
    </div>
  );
};

export const EmailSkeletonList: React.FC<EmailSkeletonRowProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-2.5" data-testid="email-skeleton-list" aria-label="Loading emails">
      {Array.from({ length: count }).map((_, idx) => (
        <EmailSkeletonRow key={idx} />
      ))}
    </div>
  );
};

