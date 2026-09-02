'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { computeAvailableToSave } from '@/lib/goalCalculations';
import { PiggyBank, ShieldAlert, Wallet, Tag, Calendar, Sparkles } from 'lucide-react';

export default function GoalForm({ categories, minBalance, editingGoal, onSaved, onCancelEdit }) {
  const supabase = createClient();

  const emptyForm = {
    type: 'save',
    title: '',
    target_amount: '',
    category_id: '',
    deadline: '',
    starting_amount: '',
    start_date: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fetchingAvailable, setFetchingAvailable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingGoal) {
      setForm({
        type: editingGoal.type,
        title: editingGoal.title,
        target_amount: editingGoal.target_amount,
        category_id: editingGoal.category_id || '',
        deadline: editingGoal.deadline || '',
        starting_amount: editingGoal.starting_amount || '',
        start_date: editingGoal.start_date || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingGoal]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleUseAvailableToSave() {
    setFetchingAvailable(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const available = await computeAvailableToSave(supabase, user.id, minBalance);
    setFetchingAvailable(false);
    handleChange('starting_amount', available.toFixed(2));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      user_id: user.id,
      type: form.type,
      title: form.title,
      target_amount: parseFloat(form.target_amount),
      category_id: form.type === 'limit' && form.category_id ? form.category_id : null,
      deadline: form.deadline || null,
      starting_amount: form.type === 'save' ? parseFloat(form.starting_amount) || 0 : 0,
      start_date: form.type === 'limit' ? form.start_date || null : null,
    };

    let result;
    if (editingGoal) {
      result = await supabase.from('goals').update(payload).eq('id', editingGoal.id);
    } else {
      result = await supabase.from('goals').insert(payload);
    }

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      setForm(emptyForm);
      onSaved();
    }
  }

  const outflowCategories = categories.filter((c) => c.type === 'outflow');
  const inputClasses =
    'w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';
  const inputWithIconClasses = `${inputClasses} pl-9`;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl2 shadow-card p-4 sm:p-5 space-y-3">
      <h2 className="font-semibold text-ink-900">{editingGoal ? 'Edit Goal' : 'New Goal'}</h2>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => handleChange('type', 'save')}
          className={
            form.type === 'save'
              ? 'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border bg-inflow text-white border-inflow'
              : 'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border text-ink-500 border-ink-200 hover:bg-ink-50'
          }
        >
          <PiggyBank size={16} />
          Savings Goal
        </button>
        <button
          type="button"
          onClick={() => handleChange('type', 'limit')}
          className={
            form.type === 'limit'
              ? 'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border bg-outflow text-white border-outflow'
              : 'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border text-ink-500 border-ink-200 hover:bg-ink-50'
          }
        >
          <ShieldAlert size={16} />
          Spending Limit
        </button>
      </div>

      <input
        type="text"
        placeholder="Goal Title (e.g. Emergency Fund)"
        value={form.title}
        onChange={(e) => handleChange('title', e.target.value)}
        required
        className={inputClasses}
      />

      <div className="relative">
        <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder={form.type === 'save' ? 'Target Amount To Save (₹)' : 'Spending Limit (₹)'}
          value={form.target_amount}
          onChange={(e) => handleChange('target_amount', e.target.value)}
          required
          className={inputWithIconClasses}
        />
      </div>

      {form.type === 'save' && (
        <div>
          <label className="text-xs text-ink-400">
            Previous Savings Already Set Aside (Optional) — Counts Toward This Goal From Day One
          </label>
          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.starting_amount}
              onChange={(e) => handleChange('starting_amount', e.target.value)}
              className={`flex-1 ${inputClasses}`}
            />
            <button
              type="button"
              onClick={handleUseAvailableToSave}
              disabled={fetchingAvailable}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-0 border border-brand-600 text-brand-600 rounded-lg text-sm font-medium hover:bg-brand-50 whitespace-nowrap disabled:opacity-50 transition-colors"
            >
              <Sparkles size={14} />
              {fetchingAvailable ? 'Calculating…' : 'Use Available'}
            </button>
          </div>
        </div>
      )}

      {form.type === 'limit' && (
        <>
          <div className="relative">
            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <select
              value={form.category_id}
              onChange={(e) => handleChange('category_id', e.target.value)}
              className={`${inputWithIconClasses} appearance-none`}
            >
              <option value="">All Spending (No Specific Category)</option>
              {outflowCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-ink-400">Start Date (Beginning Of The Limit Period)</label>
            <div className="relative mt-1">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={inputWithIconClasses}
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="text-xs text-ink-400">
          {form.type === 'save' ? 'Deadline (Optional, But Needed For Daily Suggestions)' : 'End Date (End Of The Limit Period)'}
        </label>
        <div className="relative mt-1">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
            className={inputWithIconClasses}
          />
        </div>
      </div>

      {error && <p className="text-outflow text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving…' : editingGoal ? 'Update Goal' : 'Create Goal'}
        </button>
        {editingGoal && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-4 border border-ink-200 rounded-lg text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}