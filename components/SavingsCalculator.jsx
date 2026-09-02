'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { computeSavingsRate, computeTimeToGoal } from '@/lib/goalCalculations';
import { Calculator, Calendar } from 'lucide-react';

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function SavingsCalculator() {
  const supabase = createClient();

  const [startDate, setStartDate] = useState(daysAgoStr(7));
  const [endDate, setEndDate] = useState(todayStr());
  const [targetAmount, setTargetAmount] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const maxDate = todayStr();

  useEffect(() => {
    calculate();
  }, [startDate, endDate, targetAmount]);

  function handleEndDateChange(value) {
    setError('');
    if (value > maxDate) {
      setError("End Date Can't Be In The Future.");
      return;
    }
    setEndDate(value);
  }

  function handleStartDateChange(value) {
    setError('');
    if (value > maxDate) {
      setError("Start Date Can't Be In The Future.");
      return;
    }
    setStartDate(value);
  }

  async function calculate() {
    if (error || !startDate || !endDate || startDate > endDate) {
      setResult(null);
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const rate = await computeSavingsRate(supabase, user.id, start, end);
    const target = parseFloat(targetAmount);

    const newResult = { ...rate };
    if (!isNaN(target) && target > 0) {
      newResult.timeNeeded = computeTimeToGoal(target, rate.dailyRate);
      newResult.target = target;
    }

    setResult(newResult);
    setLoading(false);
  }

  const inputClasses =
    'w-full border border-ink-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';

  return (
    <div className="bg-white rounded-xl2 shadow-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator size={18} className="text-brand-600" />
        <h2 className="font-semibold text-ink-900">Time-To-Save Calculator</h2>
      </div>
      <p className="text-sm text-ink-400">
        Pick A Past Period To Measure Your Saving Rate, Then See How Long Any Target Amount Would Take At That Pace. Defaults To The Last 7 Days.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-400">From</label>
          <div className="relative mt-1">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="date"
              value={startDate}
              max={maxDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-ink-400">To</label>
          <div className="relative mt-1">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="date"
              value={endDate}
              max={maxDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-outflow text-sm">{error}</p>}

      <div>
        <label className="text-xs text-ink-400">Target Amount To Save (₹)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="e.g. 1500"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {loading && <p className="text-sm text-ink-300">Calculating…</p>}

      {!loading && result && (
        <div className="bg-ink-50 rounded-lg p-3.5 text-sm space-y-1.5">
          <p className="text-ink-700">
            Over <strong>{result.days} Day{result.days === 1 ? '' : 's'}</strong>: Inflow ₹{result.totalInflow.toFixed(2)}, Outflow ₹{result.totalOutflow.toFixed(2)}
          </p>
          <p className="text-ink-700">
            Net Savings Rate:{' '}
            <strong className={result.dailyRate >= 0 ? 'text-inflow' : 'text-outflow'}>
              ₹{result.dailyRate.toFixed(2)}/Day
            </strong>
          </p>
          {result.target && (
            result.timeNeeded === null ? (
              <p className="text-outflow">
                At This Rate You're Not Saving — A Positive Rate Is Needed To Reach ₹{result.target.toFixed(2)}.
              </p>
            ) : (
              <p className="text-ink-700">
                To Save <strong>₹{result.target.toFixed(2)}</strong> At This Rate: About{' '}
                <strong>{result.timeNeeded} Day{result.timeNeeded === 1 ? '' : 's'}</strong>.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}