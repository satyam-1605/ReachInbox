import React from 'react';
import { Mail, ExternalLink, LogIn, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { User, SlackStatus } from '@/types';
import { Button } from './ui/Button';
import { api } from '@/lib/api';

export interface HeaderProps {
  user: User | null;
  slackStatus: SlackStatus;
  onLogout: () => void;
  onSlackConnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  slackStatus,
  onLogout,
  onSlackConnect,
}) => {
  const bullBoardUrl = api.getBullBoardUrl();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-sm">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-gray-900 tracking-tight">
                ReachInbox
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                Scheduler
              </span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block">
              Reliable delayed email delivery with BullMQ & Redis
            </p>
          </div>
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Bull Board link */}
          <a
            href={bullBoardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            <span>Bull Board</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
          </a>

          {/* Slack Status Indicator / Connect Button */}
          {slackStatus.connected ? (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg"
              title={`Slack connected: ${slackStatus.teamName || 'Workspace'}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Slack Connected</span>
            </div>
          ) : (
            <button
              onClick={onSlackConnect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
              title="Connect Slack for rate limit alerts"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Connect Slack</span>
            </button>
          )}

          {/* User Auth Profile */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
              <div className="flex items-center gap-2">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-xs font-bold text-primary-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium text-gray-800 leading-none">{user.name}</p>
                  <p className="text-[10px] text-gray-500 leading-none mt-1 truncate max-w-[130px]">
                    {user.email}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-gray-500 hover:text-gray-900 p-2"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <a
              href={api.getGoogleLoginUrl()}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login with Google</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
