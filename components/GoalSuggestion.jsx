'use client';

import { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';

export default function GoalSuggestion({ suggestion }) {
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    setOverrides({});
  }, [suggestion]);

  if (!suggestion || suggestion.status === 'unknown') return null;

  const statusStyles = {
    complete: 'bg-green-50 text-inflow border-green-100',
    'on-track': 'bg-brand-50 text-brand-700 border-brand-100',
    tight: 'bg-amber-50 text-amber-700 border-amber-100',
    exceeded: 'bg-red-50 text-outflow border-red-100',
    overdue: 'bg-red-50 text-outflow border-red-100',
    'no-deadline': 'bg-ink-50 text-ink-600 border-ink-100',
  };

  const hasBreakdown = suggestion.categoryBreakdown && suggestion.categoryBreakdown.length > 0;

  function handleOverride(categoryId, value) {
    setOverrides((prev) => ({ ...prev, [categoryId]: value }));
  }

  function amountFor(item) {
    const override = overrides[item.categoryId];
    return override !== undefined && override !== '' ? parseFloat(override) : item.suggestedAmount;
  }

  const customTotal = hasBreakdown
    ? suggestion.categoryBreakdown.reduce((sum, item) => sum + (amountFor(item) || 0), 0)
    : 0;

  const diff = hasBreakdown ? customTotal - suggestion.suggestedDailySpend : 0;

  return (
    <div className={`border rounded-lg p-3.5 space-y-2 ${statusStyles[suggestion.status] || 'bg-ink-50'}`}>
      <p className="flex items-start gap-2 text-sm font-medium">
        <Lightbulb size={15} className="flex-shrink-0 mt-0.5" />
        {suggestion.message}
      </p>

      {hasBreakdown && (
        <div className="bg-white/70 rounded-lg p-3 space-y-2 mt-2">
          <p className="text-xs text-ink-500">
            Suggested Daily Split By Category (Based On Your Recent Spending Habits) — Edit Any Amount To Customize:
          </p>
          {suggestion.categoryBreakdown.map((item) => (
            <div key={item.categoryId} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="flex-1 text-ink-700 truncate">{item.name}</span>
              <span className="text-xs text-ink-400">{(item.share * 100).toFixed(0)}%</span>
              <div className="flex items-center gap-1">
                <span className="text-ink-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={overrides[item.categoryId] ?? item.suggestedAmount.toFixed(2)}
                  onChange={(e) => handleOverride(item.categoryId, e.target.value)}
                  className="w-24 border border-ink-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-between text-xs pt-2 border-t border-ink-100">
            <span className="text-ink-500">Your Custom Total Vs. Suggested Budget:</span>
            <span className={Math.abs(diff) < 0.01 ? 'text-ink-500' : diff > 0 ? 'text-outflow font-medium' : 'text-inflow font-medium'}>
              ₹{customTotal.toFixed(2)} {Math.abs(diff) >= 0.01 && `(${diff > 0 ? '+' : ''}₹${diff.toFixed(2)} Vs Suggestion)`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}