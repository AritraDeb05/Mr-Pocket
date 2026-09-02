'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Nav from '@/components/Nav';
import GroupExpenseForm from '@/components/GroupExpenseForm';
import GroupExpenseList from '@/components/GroupExpenseList';
import GroupBalanceSummary from '@/components/GroupBalanceSummary';
import InviteMemberModal from '@/components/InviteMemberModal';
import { Users, UserPlus, Copy, RefreshCw, Trash2 } from 'lucide-react';

const POLL_INTERVAL_MS = 15000;

export default function GroupDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [shares, setShares] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id);

    const [{ data: groupData }, { data: memberData }, { data: expenseData }, { data: settlementData }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', id).single(),
      supabase.from('group_members').select('*').eq('group_id', id),
      supabase.from('group_expenses').select('*').eq('group_id', id).order('occurred_at', { ascending: false }),
      supabase.from('group_settlements').select('*').eq('group_id', id),
    ]);

    setGroup(groupData);
    setMembers(memberData || []);
    setExpenses(expenseData || []);
    setSettlements(settlementData || []);

    if (expenseData && expenseData.length > 0) {
      const { data: shareData } = await supabase
        .from('group_expense_shares')
        .select('*')
        .in('expense_id', expenseData.map((e) => e.id));
      setShares(shareData || []);
    } else {
      setShares([]);
    }

    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), POLL_INTERVAL_MS);
    function handleFocus() {
      loadData(true);
    }
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData]);

  function copyCode() {
    navigator.clipboard.writeText(group.invite_code);
  }

  async function handleDeleteGroup() {
    const confirmed = window.confirm(
      `Permanently Delete "${group.name}"? This Removes The Group For All Members, Along With Every Expense And Settlement Record. This Cannot Be Undone.`
    );
    if (!confirmed) return;

    setDeletingGroup(true);
    const { error } = await supabase.from('groups').delete().eq('id', id);
    setDeletingGroup(false);

    if (error) {
      alert(error.message);
    } else {
      router.push('/groups');
    }
  }

  if (loading || !group) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="p-8 text-ink-400">Loading…</div>
      </div>
    );
  }

  const isCreator = group.created_by === currentUserId;

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white rounded-xl2 shadow-card p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900">
              <Users size={20} className="text-brand-600" />
              {group.name}
            </h1>
            <button onClick={copyCode} className="flex items-center gap-1 text-xs text-ink-400 mt-1 hover:text-brand-600">
              Code: {group.invite_code} <Copy size={12} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-ink-300">
              <RefreshCw size={11} /> Live
            </span>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-ink-200 rounded-lg text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              <UserPlus size={16} /> Invite
            </button>
            {isCreator && (
              <button
                onClick={handleDeleteGroup}
                disabled={deletingGroup}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-outflow rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                title="Delete Group"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">{deletingGroup ? 'Deleting…' : 'Delete Group'}</span>
              </button>
            )}
          </div>
        </div>

        <GroupBalanceSummary
          members={members}
          expenses={expenses}
          shares={shares}
          settlements={settlements}
          currentUserId={currentUserId}
          groupId={id}
          onChanged={loadData}
        />

        <GroupExpenseForm groupId={id} members={members} currentUserId={currentUserId} onSaved={loadData} />

        <GroupExpenseList expenses={expenses} shares={shares} members={members} groupId={id} onChanged={loadData} />

        {showInvite && (
          <InviteMemberModal groupId={id} groupName={group.name} onClose={() => setShowInvite(false)} />
        )}
      </div>
    </div>
  );
}