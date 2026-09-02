'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Mail } from 'lucide-react';

export default function InviteMemberModal({ groupId, groupName, onClose }) {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleInvite(e) {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('group_invites')
      .insert({ group_id: groupId, group_name: groupName, invited_email: email, invited_by: user.id });

    setLoading(false);
    setMsg(error ? error.message : "Invite Sent. They'll See It When They Log In.");
    setEmail('');
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl2 shadow-card p-5 w-full max-w-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-semibold text-ink-900">
            <Mail size={18} className="text-brand-600" /> Invite By Email
          </h2>
          <button onClick={onClose} className="p-1 text-ink-400 hover:text-ink-900"><X size={18} /></button>
        </div>
        <form onSubmit={handleInvite} className="space-y-3">
          <input
            type="email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {msg && <p className="text-sm text-ink-500">{msg}</p>}
          <button type="submit" disabled={loading} className="w-full bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50">
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}