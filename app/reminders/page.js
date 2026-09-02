'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureDefaultCategories } from '@/lib/categories';
import { sortReminders } from '@/lib/reminderCalculations';
import Nav from '@/components/Nav';
import ReminderForm from '@/components/ReminderForm';
import ReminderCard from '@/components/ReminderCard';
import { BellRing } from 'lucide-react';

export default function RemindersPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [editingReminder, setEditingReminder] = useState(null);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await ensureDefaultCategories(supabase, user.id);

    const [{ data: cats }, { data: reminderRows }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
      supabase.from('reminders').select('*').eq('user_id', user.id),
    ]);

    setCategories(cats || []);
    setReminders(reminderRows || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();

    function handleFocus() {
      loadData();
    }
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadData]);

  function handleSaved() {
    setEditingReminder(null);
    loadData();
  }

  function handleEdit(reminder) {
    setEditingReminder(reminder);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingReminder(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="p-8 text-ink-400">Loading…</div>
      </div>
    );
  }

  const sorted = sortReminders(reminders);
  const unpaidCount = reminders.filter((r) => !r.paid_at).length;

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900">
            <BellRing size={22} className="text-brand-600" />
            Reminders
            {unpaidCount > 0 && (
              <span className="text-sm font-normal text-ink-400">({unpaidCount} Pending)</span>
            )}
          </h1>
          <button onClick={loadData} className="text-sm text-brand-600 hover:underline">
            Refresh
          </button>
        </div>

        <ReminderForm
          categories={categories}
          editingReminder={editingReminder}
          onSaved={handleSaved}
          onCancelEdit={handleCancelEdit}
        />

        {sorted.length === 0 ? (
          <div className="bg-white rounded-xl2 shadow-card p-10 text-center text-ink-400">
            No Reminders Yet. Add Your First One Above.
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                categories={categories}
                onChanged={loadData}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}