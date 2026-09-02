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

  const { code } = await request.json();
  if (!code) {
    return NextResponse.json({ error: 'Code Required' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: group, error: findError } = await admin
    .from('groups')
    .select('id, name')
    .eq('invite_code', code.toUpperCase().trim())
    .single();

  if (findError || !group) {
    return NextResponse.json({ error: 'No Group Found With That Code.' }, { status: 404 });
  }

  const { error: joinError } = await admin
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id, email: user.email });

  if (joinError) {
    if (joinError.code === '23505') {
      return NextResponse.json({ error: "You're Already In This Group." }, { status: 409 });
    }
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, group });
}