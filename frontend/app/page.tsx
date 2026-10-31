'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Send,
  Plus,
  RefreshCw,
  Filter,
  Menu,
  Mail,
  Check,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { ScheduledTab } from '@/components/ScheduledTab';
import { SentTab } from '@/components/SentTab';
import { SearchBar } from '@/components/SearchBar';
import { SearchResultsView } from '@/components/SearchResultsView';
import { ComposeView } from '@/components/ComposeView';
import { EmailDetailView } from '@/components/EmailDetailView';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { EmailRecord, EmailStatus, SearchEmailItem, SlackStatus, User } from '@/types';

export default function DashboardPage() {
  const router = useRouter();

  // Auth & Slack state
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });

  // Tab & Data state
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);
  const [isLoadingSent, setIsLoadingSent] = useState(true);
  const [scheduledError, setScheduledError] = useState<string | null>(null);
  const [sentError, setSentError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchEmailItem[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Modal & Toast & Responsive & Detail state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Filter & Sort state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmailStatus>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  const isFilterActive = statusFilter !== 'ALL' || sortOrder !== 'NEWEST';

  // Memoized filtered & sorted scheduled emails
  const filteredScheduledEmails = useMemo(() => {
    let list = [...scheduledEmails];
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'SCHEDULED') {
        list = list.filter((e) => e.status === 'SCHEDULED' || e.status === 'QUEUED');
      } else {
        list = list.filter((e) => e.status === statusFilter);
      }
    }
    list.sort((a, b) => {
      const timeA = new Date(a.scheduledAt || a.createdAt).getTime();
      const timeB = new Date(b.scheduledAt || b.createdAt).getTime();
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });
    return list;
  }, [scheduledEmails, statusFilter, sortOrder]);

  // Memoized filtered & sorted sent emails
  const filteredSentEmails = useMemo(() => {
    let list = [...sentEmails];
    if (statusFilter !== 'ALL') {
      list = list.filter((e) => e.status === statusFilter);
    }
    list.sort((a, b) => {
      const timeA = new Date(a.sentAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.sentAt || b.updatedAt || b.createdAt).getTime();
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });
    return list;
  }, [sentEmails, statusFilter, sortOrder]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch initial profile & Slack status (redirects to /login if unauthenticated)
  const fetchAuthAndSlack = useCallback(async () => {
    try {
      const meRes = await api.getMe();
      if (!meRes.user) {
        router.replace('/login');
        return;
      }
      setUser(meRes.user);
      setCheckingAuth(false);
    } catch {
      setUser(null);
      router.replace('/login');
      return;
    }

    try {
      const slackRes = await api.getSlackStatus();
      setSlackStatus(slackRes);
    } catch {
      setSlackStatus({ connected: false });
    }
  }, [router]);

  // Fetch Scheduled Emails
  const fetchScheduled = useCallback(async () => {
    setIsLoadingScheduled(true);
    setScheduledError(null);
    try {
      const res = await api.getScheduledEmails();
      setScheduledEmails(res.emails || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch scheduled emails';
      setScheduledError(msg);
    } finally {
      setIsLoadingScheduled(false);
    }
  }, []);

  // Fetch Sent Emails
  const fetchSent = useCallback(async () => {
    setIsLoadingSent(true);
    setSentError(null);
    try {
      const res = await api.getSentEmails();
      setSentEmails(res.emails || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch sent emails';
      setSentError(msg);
    } finally {
      setIsLoadingSent(false);
    }
  }, []);

  // Search Handler
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.searchEmails(query);
      setSearchResults(res.results || []);
      setSearchTotal(res.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search request failed';
      showToast(msg, 'error');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Check for Slack connection query param callback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('slack') === 'connected') {
        showToast('Slack connected successfully for rate limit alerts!', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAuthAndSlack();
    fetchScheduled();
    fetchSent();
  }, [fetchAuthAndSlack, fetchScheduled, fetchSent]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // Proceed to login redirect even if logout endpoint errored
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.replace('/login');
      }
    }
  };

  const handleSlackConnect = () => {
    if (!user) {
      showToast('Please log in before connecting Slack.', 'info');
      return;
    }
    window.location.href = api.getSlackConnectUrl(user.id);
  };

  const handleComposeSuccess = (count: number) => {
    showToast(`Successfully scheduled ${count} email${count === 1 ? '' : 's'}!`, 'success');
    fetchScheduled();
  };

  // Auth gate: If still checking session on landing or currently logging out, render clean loading screen
  if (checkingAuth || isLoggingOut || !user) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 select-none"
        data-testid="auth-loading-screen"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-sm animate-pulse">
            <Mail className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
            {isLoggingOut ? 'Logging out...' : 'Loading ReachInbox...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-row">
      {/* Left Sidebar (Figma Shell) */}
      <Sidebar
        user={user}
        slackStatus={slackStatus}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setStatusFilter('ALL');
          setSearchQuery('');
          setSelectedEmail(null);
          setIsMobileMenuOpen(false);
        }}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        onComposeClick={() => {
          setIsComposeOpen(true);
          setSelectedEmail(null);
          setIsMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
        onSlackConnect={handleSlackConnect}
        isOpenOnMobile={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area on the right: Full page Compose, Email Detail, or Email List */}
      {isComposeOpen ? (
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <ComposeView
            user={user}
            onBack={() => setIsComposeOpen(false)}
            onSuccess={handleComposeSuccess}
            onError={(err) => showToast(err, 'error')}
          />
        </main>
      ) : selectedEmail ? (
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <EmailDetailView
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
          />
        </main>
      ) : (
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Control Bar with Search */}
          <div className="h-16 px-4 sm:px-8 border-b border-gray-200 bg-white flex items-center justify-between gap-3 sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-1 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 md:hidden"
                title="Open menu"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 capitalize truncate">
                {searchQuery ? 'Search Results' : `${activeTab} Emails`}
              </h1>
              {!searchQuery && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                  {isFilterActive
                    ? `${activeTab === 'scheduled' ? filteredScheduledEmails.length : filteredSentEmails.length} of ${
                        activeTab === 'scheduled' ? scheduledEmails.length : sentEmails.length
                      }`
                    : activeTab === 'scheduled'
                    ? scheduledEmails.length
                    : sentEmails.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <SearchBar onSearch={handleSearch} isSearching={isSearching} />

              {/* Filter Popover Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((prev) => !prev)}
                  title="Filter emails"
                  aria-label="Filter emails"
                  className={`p-2.5 rounded-xl border transition-colors relative ${
                    isFilterActive || isFilterOpen
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  {isFilterActive && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-600 ring-2 ring-white" />
                  )}
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Filter & Sort
                      </span>
                      {isFilterActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('ALL');
                            setSortOrder('NEWEST');
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Sort Options */}
                    <div className="py-3 border-b border-gray-100 space-y-2">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Sort By Date
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSortOrder('NEWEST')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors ${
                            sortOrder === 'NEWEST'
                              ? 'bg-primary-50 border-primary-500 text-primary-700 font-semibold'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Newest first
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortOrder('OLDEST')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors ${
                            sortOrder === 'OLDEST'
                              ? 'bg-primary-50 border-primary-500 text-primary-700 font-semibold'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Oldest first
                        </button>
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="pt-3 space-y-2">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Status
                      </label>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('ALL')}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                            statusFilter === 'ALL'
                              ? 'bg-primary-50 text-primary-700 font-semibold'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span>All Statuses</span>
                          {statusFilter === 'ALL' && <Check className="w-3.5 h-3.5" />}
                        </button>

                        {activeTab === 'scheduled' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setStatusFilter('SCHEDULED')}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                                statusFilter === 'SCHEDULED'
                                  ? 'bg-primary-50 text-primary-700 font-semibold'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span>Queued / Scheduled</span>
                              {statusFilter === 'SCHEDULED' && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatusFilter('RESCHEDULED')}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                                statusFilter === 'RESCHEDULED'
                                  ? 'bg-primary-50 text-primary-700 font-semibold'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span>Rescheduled (Rate Limit)</span>
                              {statusFilter === 'RESCHEDULED' && <Check className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setStatusFilter('SENT')}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                                statusFilter === 'SENT'
                                  ? 'bg-primary-50 text-primary-700 font-semibold'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span>Sent / Delivered</span>
                              {statusFilter === 'SENT' && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatusFilter('FAILED')}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                                statusFilter === 'FAILED'
                                  ? 'bg-primary-50 text-primary-700 font-semibold'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span>Failed</span>
                              {statusFilter === 'FAILED' && <Check className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={activeTab === 'scheduled' ? fetchScheduled : fetchSent}
                disabled={isLoadingScheduled || isLoadingSent}
                title="Refresh list"
                aria-label="Refresh list"
                className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    (activeTab === 'scheduled' ? isLoadingScheduled : isLoadingSent)
                      ? 'animate-spin text-primary-600'
                      : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Tab Content or Search Results */}
          <div className="p-6 sm:p-8 flex-1">
            {isFilterActive && !searchQuery && (
              <div className="mb-4 flex items-center gap-2 p-2.5 bg-primary-50/60 border border-primary-200/60 rounded-xl text-xs text-primary-800">
                <Filter className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                <span className="truncate">
                  Filtered by: <strong>{statusFilter !== 'ALL' ? statusFilter : 'All Statuses'}</strong> • Sorted by: <strong>{sortOrder === 'NEWEST' ? 'Newest first' : 'Oldest first'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSortOrder('NEWEST');
                  }}
                  className="ml-auto text-xs font-semibold text-primary-700 hover:text-primary-900 underline shrink-0"
                >
                  Clear filter
                </button>
              </div>
            )}

            {searchQuery ? (
              <SearchResultsView
                query={searchQuery}
                results={searchResults}
                total={searchTotal}
                onClear={() => handleSearch('')}
              />
            ) : activeTab === 'scheduled' ? (
              <ScheduledTab
                emails={filteredScheduledEmails}
                isLoading={isLoadingScheduled}
                error={scheduledError}
                onRefresh={fetchScheduled}
                onComposeClick={() => setIsComposeOpen(true)}
                onSelectEmail={setSelectedEmail}
              />
            ) : (
              <SentTab
                emails={filteredSentEmails}
                isLoading={isLoadingSent}
                error={sentError}
                onRefresh={fetchSent}
                onComposeClick={() => setIsComposeOpen(true)}
                onSelectEmail={setSelectedEmail}
              />
            )}
          </div>
        </main>
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}

