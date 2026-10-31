import React, { useState, useRef, useEffect } from 'react';
import {
  Mail,
  Calendar,
  Send,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  LogIn,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { User, SlackStatus } from '@/types';
import { api } from '@/lib/api';

export interface SidebarProps {
  user: User | null;
  slackStatus: SlackStatus;
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  scheduledCount: number;
  sentCount: number;
  onComposeClick: () => void;
  onLogout: () => void;
  onSlackConnect: () => void;
  isOpenOnMobile?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  slackStatus,
  activeTab,
  onTabChange,
  scheduledCount,
  sentCount,
  onComposeClick,
  onLogout,
  onSlackConnect,
  isOpenOnMobile = false,
  onMobileClose,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bullBoardUrl = api.getBullBoardUrl();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenOnMobile && (
        <div
          data-testid="sidebar-mobile-backdrop"
          onClick={onMobileClose}
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
        />
      )}

      <aside
        className={`w-64 sm:w-72 h-screen sticky top-0 bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 select-none z-30 transition-transform duration-200 ${
          isOpenOnMobile
            ? 'fixed inset-y-0 left-0 z-50 shadow-2xl flex translate-x-0'
            : 'hidden md:flex'
        }`}
      >
      {/* Top section: Logo, User Profile Card, Compose, Nav Links */}
      <div className="p-5 space-y-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-sm">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-gray-900 tracking-tight">
                ReachInbox
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-semibold uppercase rounded-md bg-primary-50 text-primary-700 border border-primary-200">
                Scheduler
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Email delivery system</p>
          </div>
        </div>

        {/* User Card with Dropdown Menu (At the Top) */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            {/* Popover Dropdown Menu (Opens Downward from Top) */}
            {isUserMenuOpen && (
              <div
                role="menu"
                aria-label="User menu"
                className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="px-2.5 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Google Account</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}

            {/* User Profile Card Button */}
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
              className="w-full flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 transition-colors text-left group"
              title="User options"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-xs font-bold text-primary-700 shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate mt-1 leading-none">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="text-gray-400 group-hover:text-gray-600 p-1">
                {isUserMenuOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>
          </div>
        ) : (
          <a
            href={api.getGoogleLoginUrl()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login with Google</span>
          </a>
        )}

        {/* Compose Button (Figma Green Button) */}
        <button
          onClick={onComposeClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm shadow-sm transition-all hover:shadow active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>Compose</span>
        </button>

        {/* Navigation Tabs */}
        <nav className="space-y-1.5" aria-label="Mailbox folders">
          <button
            onClick={() => onTabChange('scheduled')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'scheduled'
                ? 'bg-primary-50 text-primary-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar
                className={`w-4 h-4 ${
                  activeTab === 'scheduled' ? 'text-primary-600' : 'text-gray-400'
                }`}
              />
              <span>Scheduled</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                activeTab === 'scheduled'
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange('sent')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'sent'
                ? 'bg-primary-50 text-primary-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send
                className={`w-4 h-4 ${
                  activeTab === 'sent' ? 'text-primary-600' : 'text-gray-400'
                }`}
              />
              <span>Sent</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                activeTab === 'sent'
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {sentCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Bottom section: Bull Board, Slack Alert, User Profile */}
      <div className="p-4 border-t border-gray-100 space-y-3">
        {/* Bull Board link */}
        <a
          href={bullBoardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Bull Board Queue
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
        </a>

        {/* Slack Connection Pill / Button */}
        {slackStatus.connected ? (
          <div
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg"
            title={`Slack connected: ${slackStatus.teamName || 'Workspace'}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Slack Connected</span>
          </div>
        ) : (
          <button
            onClick={onSlackConnect}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors text-left"
            title="Connect Slack for rate limit alerts"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Connect Slack</span>
          </button>
        )}
      </div>
    </aside>
    </>
  );
};
