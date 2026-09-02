'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { computeGoalProgress, generateGoalSuggestion } from '@/lib/goalCalculations';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import GoalSuggestion from './GoalSuggestion';
import { PiggyBank, ShieldAlert, Pencil, Trash2, Clock } from 'lucide-react';

export default function GoalCard({ goal, categories, onChanged, onEdit }) {
  const supabase = createClient();

  const [progress, setProgress] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoalData();
  }, [goal]);

  async function loadGoalData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [progressResult, suggestionResult] = await Promise.all([
      computeGoalProgress(supabase, user.id, goal),
      generateGoalSuggestion(supabase, user.id, goal, categories),
    ]);

    setProgress(progressResult);
    setSuggestion(suggestionResult);
    setLoading(false);
  }

  const category = goal.category_id ? categories.find((c) => c.id === goal.category_id) : null;
  const startingAmount = Number(goal.starting_amount || 0);

  async function handleDelete() {
    const confirmed = window.confirm(`Delete Goal "${goal.title}"? This Cannot Be Undone.`);
    if (!confirmed) return;

    const { error } = await supabase.from('goals').delete().eq('id', goal.id);
    if (error) {
      alert(error.message);
    } else {
      onChanged();
    }
  }

  if (loading || progress === null) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-5">
        <p className="text-sm text-ink-300">Loading Goal…</p>
      </div>
    );
  }

  const target = Number(goal.target_amount);
  const rawPercent = target > 0 ? (progress / target) * 100 : 0;
  const isOver = goal.type === 'limit' && progress > target;
  const isComplete = goal.type === 'save' && progress >= target;
  const barWidth = Math.min(rawPercent, 100);
  const barColor = isOver ? 'bg-outflow' : isComplete ? 'bg-inflow' : 'bg-brand-600';

  const TypeIcon = goal.type === 'save' ? PiggyBank : ShieldAlert;

  return (
    <div className="bg-white rounded-xl2 shadow-card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              goal.type === 'save' ? 'bg-green-50 text-inflow' : 'bg-red-50 text-outflow'
            }`}
          >
            <TypeIcon size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  goal.type === 'save' ? 'bg-green-50 text-inflow' : 'bg-red-50 text-outflow'
                }`}
              >
                {goal.type === 'save' ? 'Savings' : 'Limit'}
              </span>
              {category && <span className="text-xs text-ink-400">· {category.name}</span>}
            </div>
            <h3 className="font-semibold text-ink-900 mt-0.5">{goal.title}</h3>
            <p className="flex items-center gap-1 text-xs text-ink-300 mt-0.5">
              <Clock size={11} />
              Tracking Since {formatDateTime(goal.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-ink-400 hover:text-outflow hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-medium text-ink-700">
            ₹{progress.toFixed(2)} <span className="text-ink-400 font-normal">of ₹{target.toFixed(2)}</span>
          </span>
          <span className={isOver ? 'text-outflow font-semibold' : 'text-ink-500 font-medium'}>
            {rawPercent.toFixed(0)}%{isOver && ' — Exceeded'}
            {isComplete && ' — Complete 🎉'}
          </span>
        </div>
        <div className="w-full h-2.5 bg-ink-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>

        {goal.type === 'save' && startingAmount > 0 && (
          <p className="text-xs text-ink-400 mt-1.5">Includes ₹{startingAmount.toFixed(2)} Previous Savings</p>
        )}

        {goal.type === 'limit' && goal.start_date && (
          <p className="text-xs text-ink-400 mt-1.5">
            Period: {formatDate(goal.start_date)}
            {goal.deadline && ` – ${formatDate(goal.deadline)}`}
          </p>
        )}

        {goal.type === 'save' && goal.deadline && (
          <p className="text-xs text-ink-400 mt-1.5">Deadline: {formatDate(goal.deadline)}</p>
        )}
      </div>

      <GoalSuggestion suggestion={suggestion} />
    </div>
  );
}