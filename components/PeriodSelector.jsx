'use client';

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { shiftPeriod, isCurrentPeriod } from '@/lib/dateRanges';

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

export default function PeriodSelector({ periodType, referenceDate, label, onPeriodTypeChange, onReferenceDateChange }) {
  const isCurrent = isCurrentPeriod(periodType, referenceDate);
  const isTodayView = periodType === 'daily' && isCurrentPeriod('daily', referenceDate);

  function handlePrev() {
    onReferenceDateChange(shiftPeriod(periodType, referenceDate, -1));
  }

  function handleNext() {
    onReferenceDateChange(shiftPeriod(periodType, referenceDate, 1));
  }

  function handleToday() {
    onPeriodTypeChange('daily');
    onReferenceDateChange(new Date());
  }

  function handleJumpToCurrent() {
    onReferenceDateChange(new Date());
  }

  const currentPeriodLabel = PERIODS.find((p) => p.key === periodType)?.label;

  return (
    <div className="bg-white rounded-xl2 shadow-card p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-ink-50 p-1 rounded-lg overflow-x-auto scrollbar-hide">
          {PERIODS.map((p) => {
            const active = periodType === p.key;
            const classes = active
              ? 'px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors bg-white text-ink-900 shadow-sm flex-shrink-0'
              : 'px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors text-ink-500 hover:text-ink-900 flex-shrink-0';
            return (
              <button key={p.key} onClick={() => onPeriodTypeChange(p.key)} className={classes}>
                {p.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleToday}
          disabled={isTodayView}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brand-600 disabled:cursor-not-allowed flex-shrink-0"
        >
          <CalendarDays size={14} />
          Today
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg text-ink-500 hover:bg-ink-50 hover:text-ink-900 transition-colors flex-shrink-0"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center min-w-0 px-2">
          <p className="font-semibold text-ink-900 text-sm sm:text-base truncate">{label}</p>
          {!isCurrent && (
            <button onClick={handleJumpToCurrent} className="text-xs text-brand-600 hover:underline">
              Jump To Current {currentPeriodLabel}
            </button>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={isCurrent}
          className="p-2 rounded-lg text-ink-500 hover:bg-ink-50 hover:text-ink-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent flex-shrink-0"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}