'use client';

import { createClient } from '@/lib/supabase/client';
import { getReminderStatus, getNextOccurrenceDate } from '@/lib/reminderCalculations';
import { formatDate } from '@/lib/dateFormat';
import { CheckCircle2, Clock, AlertTriangle, Repeat, Pencil, Trash2, CircleDollarSign } from 'lucide-react';

const STATUS_CONFIG = {
  paid: { classes: 'bg-green-50 text-inflow border-green-100', icon: CheckCircle2 },
  upcoming: { classes: 'bg-ink-50 text-ink-600 border-ink-100', icon: Clock },
  'due-today': { classes: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle },
  late: { classes: 'bg-red-50 text-outflow border-red-100', icon: AlertTriangle },
};

const RECURRENCE_LABELS = { none: 'One-Time', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

export default function ReminderCard({ reminder, categories, onChanged, onEdit }) {
  const supabase = createClient();
  const status = getReminderStatus(reminder);
  const config = STATUS_CONFIG[status.key];
  const StatusIcon = config.icon;
  const category = reminder.category_id ? categories.find((c) => c.id === reminder.category_id) : null;

  async function handleMarkPaid() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'outflow',
        amount: reminder.amount,
        category_id: reminder.category_id,
        note: `Paid: ${reminder.title}`,
        occurred_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txnError) {
      alert(txnError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('reminders')
      .update({ paid_at: new Date().toISOString(), linked_transaction_id: txn.id })
      .eq('id', reminder.id);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    const nextDueDate = getNextOccurrenceDate(reminder);
    if (nextDueDate) {
      await supabase.from('reminders').insert({
        user_id: user.id,
        title: reminder.title,
        amount: reminder.amount,
        category_id: reminder.category_id,
        due_date: nextDueDate,
        recurrence: reminder.recurrence,
        parent_reminder_id: reminder.id,
      });
    }

    onChanged();
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete Reminder "${reminder.title}"? This Cannot Be Undone.`);
    if (!confirmed) return;

    const { error } = await supabase.from('reminders').delete().eq('id', reminder.id);
    if (error) {
      alert(error.message);
    } else {
      onChanged();
    }
  }

  return (
    <div className={`border rounded-xl2 p-4 space-y-3 shadow-card ${config.classes}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-white/70">
              <StatusIcon size={12} />
              {status.label}
            </span>
            {reminder.recurrence !== 'none' && (
              <span className="flex items-center gap-1 text-xs text-ink-500">
                <Repeat size={11} />
                {RECURRENCE_LABELS[reminder.recurrence]}
              </span>
            )}
            {category && <span className="text-xs text-ink-500">· {category.name}</span>}
          </div>
          <h3 className="font-semibold text-ink-900 mt-1">{reminder.title}</h3>
          <p className="text-sm text-ink-600">
            ₹{Number(reminder.amount).toFixed(2)} — Due {formatDate(reminder.due_date)}
          </p>
        </div>

        <div className="flex gap-1">
          {!reminder.paid_at && (
            <button
              onClick={() => onEdit(reminder)}
              className="p-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-white/70 transition-colors"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-ink-400 hover:text-outflow hover:bg-white/70 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {!reminder.paid_at && (
        <button
          onClick={handleMarkPaid}
          className="w-full flex items-center justify-center gap-2 bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 transition-colors"
        >
          <CircleDollarSign size={16} />
          Mark As Paid
        </button>
      )}
    </div>
  );
}