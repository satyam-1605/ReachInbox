import React, { useState, useEffect } from 'react';
import { Clock, Calendar, X, Check } from 'lucide-react';

export interface SendLaterModalProps {
  isOpen: boolean;
  initialTime?: string;
  onClose: () => void;
  onDone: (scheduledIsoString: string) => void;
}

export const SendLaterModal: React.FC<SendLaterModalProps> = ({
  isOpen,
  initialTime,
  onClose,
  onDone,
}) => {
  // Helpers to get tomorrow's date at specific hour/minute
  const getTomorrowDateWithTime = (hours: number, minutes: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const pad = (n: number) => (n < 10 ? '0' + n : String(n));

  const formatLocalDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const formatLocalTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // State for date and time picker
  const [selectedDate, setSelectedDate] = useState(() => {
    const base = initialTime ? new Date(initialTime) : getTomorrowDateWithTime(10, 0);
    return formatLocalDate(base);
  });

  const [selectedTime, setSelectedTime] = useState(() => {
    const base = initialTime ? new Date(initialTime) : getTomorrowDateWithTime(10, 0);
    return formatLocalTime(base);
  });

  useEffect(() => {
    if (initialTime && isOpen) {
      const d = new Date(initialTime);
      if (!isNaN(d.getTime())) {
        setSelectedDate(formatLocalDate(d));
        setSelectedTime(formatLocalTime(d));
      }
    }
  }, [initialTime, isOpen]);

  if (!isOpen) return null;

  // Set quick preset
  const handleQuickPreset = (hours: number, minutes: number = 0) => {
    const d = getTomorrowDateWithTime(hours, minutes);
    setSelectedDate(formatLocalDate(d));
    setSelectedTime(formatLocalTime(d));
  };

  const handleDone = () => {
    const combinedString = `${selectedDate}T${selectedTime}:00`;
    const dateObj = new Date(combinedString);

    if (isNaN(dateObj.getTime())) {
      onDone(new Date(Date.now() + 5 * 60 * 1000).toISOString());
    } else {
      onDone(dateObj.toISOString());
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send Later schedule picker"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs select-none"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Send Later</h3>
              <p className="text-[11px] text-gray-500">Pick scheduled queue time</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Quick Options specified in Figma */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Quick Options
            </label>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickPreset(10, 0)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-primary-50 hover:text-primary-800 hover:border-primary-200 rounded-xl border border-gray-200 transition-colors text-left"
              >
                <span>Tomorrow, 10:00 AM</span>
                <span className="text-[10px] text-gray-400 font-normal">Morning</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(11, 0)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-primary-50 hover:text-primary-800 hover:border-primary-200 rounded-xl border border-gray-200 transition-colors text-left"
              >
                <span>Tomorrow, 11:00 AM</span>
                <span className="text-[10px] text-gray-400 font-normal">Pre-noon</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(15, 0)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-primary-50 hover:text-primary-800 hover:border-primary-200 rounded-xl border border-gray-200 transition-colors text-left"
              >
                <span>Tomorrow, 3:00 PM</span>
                <span className="text-[10px] text-gray-400 font-normal">Afternoon</span>
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Custom Date & Time
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  aria-label="Custom Date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Time</label>
                <input
                  type="time"
                  aria-label="Custom Time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Cancel & Done */}
        <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-xl transition-all shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};

