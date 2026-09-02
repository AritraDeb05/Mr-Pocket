'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { equalSplit } from '@/lib/splitCalculations';
import { formatDate } from '@/lib/dateFormat';
import { Trash2, RotateCcw } from 'lucide-react';

export default function GroupExpenseList({ expenses, shares, members, groupId, onChanged }) {
  const supabase = createClient();
  const [recalculating, setRecalculating] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function memberEmail(userId) {
    return members.find((m) => m.user_id === userId)?.email || 'Unknown';
  }

  async function handleDelete(expense) {
    const hasLinkedTransaction = !!expense.linked_transaction_id;
    const message = hasLinkedTransaction
      ? `Delete "${expense.title}" From This Group? The ₹${Number(expense.amount).toFixed(2)} Transaction Already Recorded In Your Personal Transactions Will Stay There — Only The Group Record Is Removed.`
      : `Delete "${expense.title}"? This Cannot Be Undone.`;

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    setDeleting(expense.id);

    // Explicitly delete only the group expense row and its shares — never
    // touch transactions here. linked_transaction_id is ON DELETE SET NULL
    // on the transactions side, so even if that transaction is later
    // deleted independently, it won't cascade back and break this expense.
    await supabase.from('group_expense_shares').delete().eq('expense_id', expense.id);
    await supabase.from('group_expenses').delete().eq('id', expense.id);

    setDeleting(null);
    onChanged();
  }

  async function handleRecalculate(expense) {
    const confirmed = window.confirm(
      `Redistribute "${expense.title}" (₹${Number(expense.amount).toFixed(2)}) Equally Across All ${members.length} Current Members? This Changes Who Owes What For This Expense.`
    );
    if (!confirmed) return;

    setRecalculating(expense.id);

    const allMemberIds = members.map((m) => m.user_id);
    const newShares = equalSplit(Number(expense.amount), allMemberIds);

    await supabase.from('group_expense_shares').delete().eq('expense_id', expense.id);
    await supabase.from('group_expense_shares').insert(
      newShares.map((s) => ({ expense_id: expense.id, user_id: s.user_id, share_amount: s.share_amount }))
    );

    setRecalculating(null);
    onChanged();
  }

  if (expenses.length === 0) {
    return <div className="bg-white rounded-xl2 shadow-card p-10 text-center text-ink-400">No Expenses Yet.</div>;
  }

  return (
    <div className="bg-white rounded-xl2 shadow-card divide-y divide-ink-100">
      {expenses.map((exp) => {
        const expShares = shares.filter((s) => s.expense_id === exp.id);
        const includesEveryone = expShares.length === members.length;

        return (
          <div key={exp.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-ink-900 text-sm">{exp.title}</h3>
                <p className="text-xs text-ink-400">
                  Paid By {memberEmail(exp.paid_by)} · {formatDate(exp.occurred_at)}
                  {exp.linked_transaction_id && ' · Logged In Your Transactions'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-900">₹{Number(exp.amount).toFixed(2)}</span>
                <button
                  onClick={() => handleDelete(exp)}
                  disabled={deleting === exp.id}
                  className="p-1 text-ink-400 hover:text-outflow disabled:opacity-50"
                  title="Delete From Group (Keeps Personal Transaction)"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {expShares.map((s) => (
                <span key={s.id} className="text-xs bg-ink-50 text-ink-500 px-2 py-0.5 rounded-full">
                  {memberEmail(s.user_id)}: ₹{Number(s.share_amount).toFixed(2)}
                </span>
              ))}
            </div>

            {exp.split_type === 'equal' && !includesEveryone && (
              <button
                onClick={() => handleRecalculate(exp)}
                disabled={recalculating === exp.id}
                className="flex items-center gap-1 text-xs text-brand-600 hover:underline mt-2 disabled:opacity-50"
              >
                <RotateCcw size={11} />
                {recalculating === exp.id ? 'Updating…' : `Include All ${members.length} Current Members`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}