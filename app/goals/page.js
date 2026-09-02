'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureDefaultCategories } from '@/lib/categories';
import { getLifetimeNet } from '@/lib/aggregations';
import Nav from '@/components/Nav';
import GoalForm from '@/components/GoalForm';
import GoalCard from '@/components/GoalCard';
import SavingsCalculator from '@/components/SavingsCalculator';
import { Wallet, PiggyBank } from 'lucide-react';

export default function GoalsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [minBalance, setMinBalance] = useState(0);
  const [lifetimeNet, setLifetimeNet] = useState(0);
  const [availableToSave, setAvailableToSave] = useState(0);
  const [editingGoal, setEditingGoal] = useState(null);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await ensureDefaultCategories(supabase, user.id);

    const [{ data: cats }, { data: goalRows }, { data: profile }, net] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('min_balance').eq('id', user.id).single(),
      getLifetimeNet(supabase, user.id),
    ]);

    const min = profile?.min_balance || 0;
    const available = net - Number(min);

    setCategories(cats || []);
    setGoals(goalRows || []);
    setMinBalance(min);
    setLifetimeNet(net);
    setAvailableToSave(available);
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
    setEditingGoal(null);
    loadData();
  }

  function handleEdit(goal) {
    setEditingGoal(goal);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingGoal(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="p-8 text-ink-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Goals</h1>
          <button onClick={loadData} className="text-sm text-brand-600 hover:underline">
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl2 shadow-card p-4">
            <div className="flex items-center gap-2 text-ink-400 mb-1">
              <Wallet size={14} />
              <p className="text-xs font-medium uppercase tracking-wide">Lifetime Net</p>
            </div>
            <p className={`text-xl font-bold ${lifetimeNet >= 0 ? 'text-inflow' : 'text-outflow'}`}>
              ₹{lifetimeNet.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-xl2 shadow-card p-4">
            <div className="flex items-center gap-2 text-ink-400 mb-1">
              <PiggyBank size={14} />
              <p className="text-xs font-medium uppercase tracking-wide">Available To Save</p>
            </div>
            <p className={`text-xl font-bold ${availableToSave >= 0 ? 'text-inflow' : 'text-outflow'}`}>
              ₹{availableToSave.toFixed(2)}
            </p>
          </div>
        </div>

        <GoalForm
          categories={categories}
          minBalance={minBalance}
          editingGoal={editingGoal}
          onSaved={handleSaved}
          onCancelEdit={handleCancelEdit}
        />

        {goals.length === 0 ? (
          <div className="bg-white rounded-xl2 shadow-card p-10 text-center text-ink-400">
            No Goals Yet. Create Your First One Above.
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                categories={categories}
                onChanged={loadData}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}

        <SavingsCalculator />
      </div>
    </div>
  );
}