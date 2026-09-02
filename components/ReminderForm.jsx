'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Wallet, Tag, Calendar, Repeat } from 'lucide-react';

export default function ReminderForm({ categories, editingReminder, onSaved, onCancelEdit }) {
  const supabase = createClient();

  const emptyForm = { title: '', amount: '', category_id: '', due_date: '', recurrence: 'none' };
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingReminder) {
      setForm({
        title: editingReminder.title,
        amount: editingReminder.amount,
        category_id: editingReminder.category_id || '',
        due_date: editingReminder.due_date,
        recurrence: editingReminder.recurrence,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingReminder]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const outflowCategories = categories.filter((c) => c.type === 'outflow');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      user_id: user.id,
      title: form.title,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      due_date: form.due_date,
      recurrence: form.recurrence,
    };

    let result;
    if (editingReminder) {
      result = await supabase.from('reminders').update(payload).eq('id', editingReminder.id);
    } else {
      result = await supabase.from('reminders').insert(payload);
    }

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      setForm(emptyForm);
      onSaved();
    }
  }

  const inputClasses =
    'w-full border border-ink-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl2 shadow-card p-5 space-y-3">
      <h2 className="font-semibold text-ink-900">{editingReminder ? 'Edit Reminder' : 'New Reminder'}</h2>

      <div className="relative">
        <Bell size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="Title (e.g. Rent, Electricity Bill)"
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
          className={inputClasses}
        />
      </div>

      <div className="relative">
        <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Amount (₹)"
          value={form.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          required
          className={inputClasses}
        />
      </div>

      <div className="relative">
        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <select
          value={form.category_id}
          onChange={(e) => handleChange('category_id', e.target.value)}
          className={`${inputClasses} appearance-none`}
        >
          <option value="">No Category</option>
          {outflowCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-ink-400">Due Date</label>
        <div className="relative mt-1">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => handleChange('due_date', e.target.value)}
            required
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-ink-400">Repeats</label>
        <div className="relative mt-1">
          <Repeat size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <select
            value={form.recurrence}
            onChange={(e) => handleChange('recurrence', e.target.value)}
            className={`${inputClasses} appearance-none`}
          >
            <option value="none">One-Time (Doesn't Repeat)</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {error && <p className="text-outflow text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving…' : editingReminder ? 'Update Reminder' : 'Create Reminder'}
        </button>
        {editingReminder && (
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