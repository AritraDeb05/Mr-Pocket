'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureDefaultCategories } from '@/lib/categories';
import Nav from '@/components/Nav';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';

const PAGE_SIZE = 100;

export default function TransactionsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await ensureDefaultCategories(supabase, user.id);

    const [{ data: cats }, { data: txns }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('occurred_at', { ascending: false })
        .range(0, PAGE_SIZE - 1),
    ]);

    setCategories(cats || []);
    setTransactions(txns || []);
    setHasMore((txns || []).length === PAGE_SIZE);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  async function handleLoadMore() {
    setLoadingMore(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: moreTxns } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .range(transactions.length, transactions.length + PAGE_SIZE - 1);

    setTransactions((prev) => [...prev, ...(moreTxns || [])]);
    setHasMore((moreTxns || []).length === PAGE_SIZE);
    setLoadingMore(false);
  }

  function handleSaved() {
    setEditingTransaction(null);
    loadInitial();
  }

  function handleEdit(transaction) {
    setEditingTransaction(transaction);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingTransaction(null);
  }

  function handleDeleted() {
    loadInitial();
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
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-ink-900">Transactions</h1>

        <TransactionForm
          categories={categories}
          editingTransaction={editingTransaction}
          onSaved={handleSaved}
          onCancelEdit={handleCancelEdit}
        />

        <TransactionList
          transactions={transactions}
          categories={categories}
          onChanged={handleDeleted}
          onEdit={handleEdit}
        />

        {hasMore && (
          <div className="text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 border border-ink-200 rounded-lg text-sm font-medium text-ink-700 hover:bg-white hover:shadow-card disabled:opacity-50 transition-all"
            >
              {loadingMore ? 'Loading…' : `Load Previous ${PAGE_SIZE}`}
            </button>
          </div>
        )}

        {!hasMore && transactions.length > 0 && (
          <p className="text-center text-sm text-ink-400">You've Reached The Beginning Of Your History.</p>
        )}
      </div>
    </div>
  );
}