import React from 'react';
import { Search, Clock, CheckCircle2 } from 'lucide-react';
import { SearchEmailItem } from '@/types';
import { Table, Column } from './ui/Table';
import { EmptyState } from './ui/EmptyState';

export interface SearchResultsViewProps {
  query: string;
  results: SearchEmailItem[];
  total: number;
  onClear: () => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query,
  results,
  total,
  onClear,
}) => {
  if (results.length === 0) {
    return (
      <EmptyState
        title={`No results found for "${query}"`}
        description="Try searching for a different email address, subject line keyword, or body snippet."
        icon={Search}
        actionLabel="Clear Search"
        onAction={onClear}
      />
    );
  }

  const columns: Column<SearchEmailItem>[] = [
    {
      header: 'Recipient',
      accessor: 'recipient',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-gray-900">{item.recipient}</span>
      ),
    },
    {
      header: 'Subject',
      accessor: 'subject',
      render: (item) => (
        <span className="text-xs text-gray-800 truncate max-w-[240px] block" title={item.subject}>
          {item.subject}
        </span>
      ),
    },
    {
      header: 'Body Preview',
      accessor: 'body',
      render: (item) => (
        <span className="text-xs text-gray-500 truncate max-w-[200px] block" title={item.body}>
          {item.body}
        </span>
      ),
    },
    {
      header: 'Timing',
      render: (item) => {
        const timeStr = item.sentAt || item.scheduledAt;
        const date = new Date(timeStr);
        return (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            {item.status === 'SENT' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-orange-600" />
            )}
            <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (item) => {
        const isSent = item.status === 'SENT';
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isSent
                ? 'bg-gray-100 text-gray-700 border border-gray-200'
                : 'bg-primary-50 text-primary-700 border border-primary-200'
            }`}
          >
            {item.status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Elasticsearch found <strong className="text-primary-700">{total}</strong> matches for &quot;{query}&quot;
        </span>
        <button
          onClick={onClear}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          Exit search mode
        </button>
      </div>
      <Table
        columns={columns}
        data={results}
        keyExtractor={(item) => item.id}
      />
    </div>
  );
};
