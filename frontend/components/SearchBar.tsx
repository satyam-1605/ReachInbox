import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export interface SearchBarProps {
  onSearch: (query: string) => void;
  isSearching?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isSearching = false }) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchTerm.trim());
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm, onSearch]);

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div className="relative w-56 sm:w-72 md:w-80 lg:w-[440px]">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
        {isSearching ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>
      <input
        type="text"
        className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
        placeholder="Search emails (recipient, subject, body)..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
