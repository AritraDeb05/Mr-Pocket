'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { generateInviteCode } from '@/lib/splitCalculations';
import Nav from '@/components/Nav';
import { Users, Plus, LogIn, Mail, Check, X } from 'lucide-react';

function GroupListItem({ group }) {
  return (
    <Link
      href={'/groups/' + group.id}
      className="block bg-white rounded-xl2 shadow-card p-4 hover:shadow-card-hover transition-shadow"
    >
      <h3 className="font-semibold text-ink-900">{group.name}</h3>
      <p className="text-xs text-ink-400 mt-0.5">Code: {group.invite_code}</p>
    </Link>
  );
}

export default function GroupsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, groups(*)')
      .eq('user_id', user.id);

    // No longer joins groups table for the name — uses the denormalized
    // group_name column stored at invite time, since RLS correctly blocks
    // reading a group you're not a member of yet.
    const { data: pendingInvites } = await supabase
      .from('group_invites')
      .select('*')
      .eq('invited_email', user.email)
      .eq('status', 'pending');

    setGroups((memberships || []).map((m) => m.groups).filter(Boolean));
    setInvites(pendingInvites || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateGroup(e) {
    e.preventDefault();
    setError('');
    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: newGroupName, created_by: user.id, invite_code: generateInviteCode() })
      .select()
      .single();

    if (groupError) {
      setError(groupError.message);
      setCreating(false);
      return;
    }

    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, email: user.email });

    setCreating(false);
    setNewGroupName('');
    loadData();
  }

  async function handleJoinGroup(e) {
    e.preventDefault();
    setError('');
    setJoining(true);

    const res = await fetch('/api/join-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: joinCode }),
    });
    const result = await res.json();

    setJoining(false);

    if (!res.ok) {
      setError(result.error || 'Something Went Wrong.');
    } else {
      setJoinCode('');
      loadData();
    }
  }

  async function handleAcceptInvite(invite) {
    const res = await fetch('/api/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId: invite.id }),
    });

    if (res.ok) loadData();
  }

  async function handleDeclineInvite(invite) {
    await supabase.from('group_invites').update({ status: 'declined' }).eq('id', invite.id);
    loadData();
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
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-ink-900">
          <Users size={22} className="text-brand-600" />
          Splits
        </h1>

        {invites.length > 0 && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl2 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
              <Mail size={14} /> Pending Invites
            </h2>
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                <span className="text-sm text-ink-700">{inv.group_name || 'A Group'}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleAcceptInvite(inv)} className="p-1.5 rounded-lg text-inflow hover:bg-green-50">
                    <Check size={16} />
                  </button>
                  <button onClick={() => handleDeclineInvite(inv)} className="p-1.5 rounded-lg text-outflow hover:bg-red-50">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form onSubmit={handleCreateGroup} className="bg-white rounded-xl2 shadow-card p-5 space-y-3">
            <h2 className="flex items-center gap-1.5 font-semibold text-ink-900 text-sm">
              <Plus size={16} className="text-brand-600" /> Create Group
            </h2>
            <input
              type="text"
              placeholder="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>

          <form onSubmit={handleJoinGroup} className="bg-white rounded-xl2 shadow-card p-5 space-y-3">
            <h2 className="flex items-center gap-1.5 font-semibold text-ink-900 text-sm">
              <LogIn size={16} className="text-brand-600" /> Join With Code
            </h2>
            <input
              type="text"
              placeholder="e.g. A3F9K2"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={joining}
              className="w-full bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >
              {joining ? 'Joining…' : 'Join'}
            </button>
          </form>
        </div>

        {error && <p className="text-outflow text-sm">{error}</p>}

        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="bg-white rounded-xl2 shadow-card p-10 text-center text-ink-400">
              No Groups Yet. Create Or Join One Above.
            </div>
          ) : (
            groups.map(function (g) {
              return <GroupListItem key={g.id} group={g} />;
            })
          )}
        </div>
      </div>
    </div>
  );
}