'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowDownCircle, ArrowUpCircle, Tag, Calendar, StickyNote, Wallet } from 'lucide-react';

function currentDateTimeValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now.getTime() - offsetMs);
  return localTime.toISOString().slice(0, 16);
}

function toLocalDateTimeValue(isoString) {
  const date = new Date(isoString);
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localTime = new Date(date.getTime() - offsetMs);
  return localTime.toISOString().slice(0, 16);
}

function getEmptyForm() {
  return {
    type: 'inflow',
    amount: '',
    category_id: '',
    note: '',
    source_dest: '',
    occurred_at: currentDateTimeValue(),
  };
}

const inputClasses =
  'w-full border border-ink-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';

export default function TransactionForm({ categories, editingTransaction, onSaved, onCancelEdit }) {
  const supabase = createClient();

  const [form, setForm] = useState(getEmptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dateTimeTouched = useRef(false);

  useEffect(() => {
    if (editingTransaction) {
      dateTimeTouched.current = true;
      setForm({
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        category_id: editingTransaction.category_id || '',
        note: editingTransaction.note || '',
        source_dest: editingTransaction.source_dest || '',
        occurred_at: toLocalDateTimeValue(editingTransaction.occurred_at),
      });
    } else {
      dateTimeTouched.current = false;
      setForm(getEmptyForm());
    }
  }, [editingTransaction]);

  useEffect(() => {
    if (editingTransaction) return;
    const interval = setInterval(() => {
      if (!dateTimeTouched.current) {
        setForm((prev) => ({ ...prev, occurred_at: currentDateTimeValue() }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [editingTransaction]);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  function handleChange(field, value) {
    if (field === 'occurred_at') dateTimeTouched.current = true;
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleTypeChange(newType) {
    setForm((prev) => ({ ...prev, type: newType, category_id: '' }));
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
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      note: form.note || null,
      source_dest: form.source_dest || null,
      occurred_at: new Date(form.occurred_at).toISOString(),
    };

    let result;
    if (editingTransaction) {
      result = await supabase.from('transactions').update(payload).eq('id', editingTransaction.id);
    } else {
      result = await supabase.from('transactions').insert(payload);
    }

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      dateTimeTouched.current = false;
      setForm(getEmptyForm());
      onSaved();
    }
  }

  function handleCancel() {
    dateTimeTouched.current = false;
    setForm(getEmptyForm());
    onCancelEdit();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl2 shadow-card p-5 space-y-3">
      <h2 className="font-semibold text-ink-900">
        {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
      </h2>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTypeChange('inflow')}
          className={
            form.type === 'inflow'
              ? 'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border bg-inflow text-white border-inflow'
              : 'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border text-ink-500 border-ink-200 hover:bg-ink-50'
          }
        >
          <ArrowDownCircle size={16} />
          Inflow
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('outflow')}
          className={
            form.type === 'outflow'
              ? 'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border bg-outflow text-white border-outflow'
              : 'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border text-ink-500 border-ink-200 hover:bg-ink-50'
          }
        >
          <ArrowUpCircle size={16} />
          Outflow
        </button>
      </div>

      <div className="relative">
        <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Amount"
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
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        placeholder={form.type === 'inflow' ? 'Source (e.g. Employer)' : 'Paid To (e.g. Zomato)'}
        value={form.source_dest}
        onChange={(e) => handleChange('source_dest', e.target.value)}
        className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />

      <div className="relative">
        <StickyNote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="Note (Optional)"
          value={form.note}
          onChange={(e) => handleChange('note', e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="relative">
        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="datetime-local"
          value={form.occurred_at}
          onChange={(e) => handleChange('occurred_at', e.target.value)}
          required
          className={inputClasses}
        />
      </div>

      {error && <p className="text-outflow text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving…' : editingTransaction ? 'Update' : 'Add Transaction'}
        </button>
        {editingTransaction && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 border border-ink-200 rounded-lg text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}