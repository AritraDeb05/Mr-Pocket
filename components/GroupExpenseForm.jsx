'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { equalSplit, validateCustomSplit } from '@/lib/splitCalculations';
import { Receipt, Wallet } from 'lucide-react';

export default function GroupExpenseForm({ groupId, members, currentUserId, onSaved }) {
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId || '');
  const [splitType, setSplitType] = useState('equal');
  const [selected, setSelected] = useState(members.map((m) => m.user_id));
  const [customAmounts, setCustomAmounts] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleMember(userId) {
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || selected.length === 0) {
      setError('Enter A Valid Amount And Select At Least One Member.');
      return;
    }

    let shares;
    if (splitType === 'equal') {
      shares = equalSplit(amt, selected);
    } else {
      shares = selected.map((id) => ({ user_id: id, share_amount: parseFloat(customAmounts[id]) || 0 }));
      if (!validateCustomSplit(amt, shares)) {
        setError('Custom Amounts Must Add Up To The Total.');
        return;
      }
    }

    setLoading(true);

    const { data: expense, error: expError } = await supabase
      .from('group_expenses')
      .insert({ group_id: groupId, paid_by: paidBy, title, amount: amt, split_type: splitType, occurred_at: new Date().toISOString() })
      .select()
      .single();

    if (expError) {
      setError(expError.message);
      setLoading(false);
      return;
    }

    await supabase.from('group_expense_shares').insert(
      shares.map((s) => ({ expense_id: expense.id, user_id: s.user_id, share_amount: s.share_amount }))
    );

    // If the current user is the payer, auto-log it as a personal outflow —
    // we can only do this for the person actually submitting, since RLS
    // rightly blocks inserting into someone else's transactions.
    if (paidBy === currentUserId) {
      const { data: txn } = await supabase
        .from('transactions')
        .insert({ user_id: currentUserId, type: 'outflow', amount: amt, note: `Group: ${title}`, occurred_at: new Date().toISOString() })
        .select()
        .single();
      if (txn) {
        await supabase.from('group_expenses').update({ linked_transaction_id: txn.id }).eq('id', expense.id);
      }
    }

    setLoading(false);
    setTitle('');
    setAmount('');
    setCustomAmounts({});
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl2 shadow-card p-5 space-y-3">
      <h2 className="flex items-center gap-1.5 font-semibold text-ink-900">
        <Receipt size={18} className="text-brand-600" /> Add Expense
      </h2>

      <input
        type="text"
        placeholder="Title (e.g. Hotel Booking)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      <div className="relative">
        <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full border border-ink-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="text-xs text-ink-400">Paid By</label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm mt-1"
        >
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.user_id === currentUserId ? 'You' : m.email}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setSplitType('equal')} className={splitType === 'equal' ? 'flex-1 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white' : 'flex-1 py-2 rounded-lg text-sm font-medium border border-ink-200 text-ink-600'}>
          Equal Split
        </button>
        <button type="button" onClick={() => setSplitType('custom')} className={splitType === 'custom' ? 'flex-1 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white' : 'flex-1 py-2 rounded-lg text-sm font-medium border border-ink-200 text-ink-600'}>
          Custom Amounts
        </button>
      </div>

      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-2">
            <input type="checkbox" checked={selected.includes(m.user_id)} onChange={() => toggleMember(m.user_id)} className="accent-brand-600" />
            <span className="flex-1 text-sm text-ink-700">{m.user_id === currentUserId ? 'You' : m.email}</span>
            {splitType === 'custom' && selected.includes(m.user_id) && (
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={customAmounts[m.user_id] || ''}
                onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [m.user_id]: e.target.value }))}
                className="w-24 border border-ink-200 rounded px-2 py-1 text-sm text-right"
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-outflow text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="w-full bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50">
        {loading ? 'Adding…' : 'Add Expense'}
      </button>
    </form>
  );
}