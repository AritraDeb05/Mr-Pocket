import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { inviteId } = await request.json();
  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from('group_invites')
    .select('*')
    .eq('id', inviteId)
    .single();

  if (inviteError || !invite || invite.invited_email !== user.email) {
    return NextResponse.json({ error: 'Invalid Invite' }, { status: 403 });
  }

  const { error: joinError } = await admin
    .from('group_members')
    .insert({ group_id: invite.group_id, user_id: user.id, email: user.email });

  if (joinError && joinError.code !== '23505') {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  await admin.from('group_invites').update({ status: 'accepted' }).eq('id', inviteId);

  return NextResponse.json({ success: true });
}