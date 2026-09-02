'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { computeGroupBalances, simplifyDebts } from '@/lib/splitCalculations';
import { formatDate } from '@/lib/dateFormat';
import { Scale, HandCoins, ArrowRight, Undo2, History } from 'lucide-react';

export default function GroupBalanceSummary({ members, expenses, shares, settlements, currentUserId, groupId, onChanged }) {
  const supabase = createClient();
  const [settlingWith, setSettlingWith] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const submittingRef = useRef(false); // hard lock against double-submit, independent of React state timing

  const balances = computeGroupBalances(expenses, shares, settlements);
  const suggestions = simplifyDebts(balances);

  function emailFor(userId) {
    if (userId === currentUserId) return 'You';
    return members.find((m) => m.user_id === userId)?.email || 'Unknown';
  }

  const youOwe = suggestions.filter((s) => s.from === currentUserId);
  const owedToYou = suggestions.filter((s) => s.to === currentUserId);
  const totalYouOwe = youOwe.reduce((sum, s) => sum + s.amount, 0);
  const totalOwedToYou = owedToYou.reduce((sum, s) => sum + s.amount, 0);

  function startSettle(toUserId, suggestedAmount) {
    setSettlingWith(toUserId);
    setSettleAmount(suggestedAmount.toFixed(2));
  }

  async function handleConfirmSettle(toUserId) {
    if (submittingRef.current) return; // blocks a second click that fires before state re-renders
    submittingRef.current = true;

    const amt = parseFloat(settleAmount);
    if (!amt || amt <= 0) {
      submittingRef.current = false;
      return;
    }

    setLoading(true);

    const { data: settlement, error } = await supabase
      .from('group_settlements')
      .insert({ group_id: groupId, paid_by: currentUserId, paid_to: toUserId, amount: amt, settled_at: new Date().toISOString() })
      .select()
      .single();

    if (!error) {
      const { data: txn } = await supabase
        .from('transactions')
        .insert({ user_id: currentUserId, type: 'outflow', amount: amt, note: `Group settlement paid to ${emailFor(toUserId)}`, occurred_at: new Date().toISOString() })
        .select()
        .single();
      if (txn) {
        await supabase.from('group_settlements').update({ payer_transaction_id: txn.id }).eq('id', settlement.id);
      }
      await fetch('/api/settlement-receiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId: settlement.id }),
      });
    }

    setLoading(false);
    setSettlingWith(null);
    setSettleAmount('');
    submittingRef.current = false;
    onChanged();
  }

  async function handleUndo(settlementId) {
    const confirmed = window.confirm('Undo This Settlement? This Removes The Linked Transactions Too.');
    if (!confirmed) return;

    setUndoingId(settlementId);
    await fetch('/api/undo-settlement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementId }),
    });
    setUndoingId(null);
    onChanged();
  }

  const allSettled = suggestions.length === 0;

  return (
    <div className="bg-white rounded-xl2 shadow-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-semibold text-ink-900">
          <Scale size={18} className="text-brand-600" /> Balances
        </h2>
        {settlements.length > 0 && (
          <button onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1 text-xs text-ink-400 hover:text-brand-600">
            <History size={12} /> {showHistory ? 'Hide' : 'Show'} History
          </button>
        )}
      </div>

      {allSettled ? (
        <p className="text-sm text-ink-400">Everyone's Settled Up 🎉</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-ink-500">You Owe</p>
              <p className="text-lg font-bold text-outflow">₹{totalYouOwe.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-ink-500">Owed To You</p>
              <p className="text-lg font-bold text-inflow">₹{totalOwedToYou.toFixed(2)}</p>
            </div>
          </div>

          {youOwe.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">You Need To Pay</p>
              {youOwe.map((s) => (
                <div key={s.to} className="border border-ink-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-ink-700">
                      You <ArrowRight size={12} className="text-ink-300" /> {emailFor(s.to)}
                    </span>
                    <span className="font-semibold text-outflow">₹{s.amount.toFixed(2)}</span>
                  </div>

                  {settlingWith === s.to ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        disabled={loading}
                        className="flex-1 border border-ink-200 rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
                      />
                      <button onClick={() => handleConfirmSettle(s.to)} disabled={loading} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
                        {loading ? 'Paying…' : 'Confirm'}
                      </button>
                      <button onClick={() => setSettlingWith(null)} disabled={loading} className="px-2 py-1.5 text-ink-400 text-xs disabled:opacity-50">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => startSettle(s.to, s.amount)} className="flex items-center gap-1.5 w-full justify-center bg-ink-900 text-white rounded-lg py-2 text-xs font-medium hover:bg-ink-800 transition-colors">
                      <HandCoins size={13} /> Pay Up
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {owedToYou.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Owed To You</p>
              {owedToYou.map((s) => (
                <div key={s.from} className="flex items-center justify-between text-sm border border-ink-100 rounded-lg p-3">
                  <span className="flex items-center gap-1.5 text-ink-700">
                    {emailFor(s.from)} <ArrowRight size={12} className="text-ink-300" /> You
                  </span>
                  <span className="font-semibold text-inflow">₹{s.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showHistory && settlements.length > 0 && (
        <div className="pt-3 border-t border-ink-100 space-y-2">
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Settlement History</p>
          {settlements.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-600">
                {emailFor(s.paid_by)} → {emailFor(s.paid_to)}: ₹{Number(s.amount).toFixed(2)}
                <span className="text-ink-300 text-xs ml-1">({formatDate(s.settled_at)})</span>
              </span>
              {s.paid_by === currentUserId && (
                <button
                  onClick={() => handleUndo(s.id)}
                  disabled={undoingId === s.id}
                  className="flex items-center gap-1 text-xs text-outflow hover:underline disabled:opacity-50"
                >
                  <Undo2 size={11} /> {undoingId === s.id ? 'Undoing…' : 'Undo'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}