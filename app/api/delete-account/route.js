import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  // Verify the request comes from a genuinely logged-in user first —
  // never trust a client-supplied user ID for something this destructive.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    // 1. Group-related child records
    await admin.from('group_expense_shares').delete().eq('user_id', user.id);
    await admin
      .from('group_settlements')
      .delete()
      .or(`paid_by.eq.${user.id},paid_to.eq.${user.id}`);
    await admin.from('group_expenses').delete().eq('paid_by', user.id);
    await admin.from('group_invites').delete().eq('invited_email', user.email);
    await admin.from('group_members').delete().eq('user_id', user.id);

    // If the user created groups, clean up all data in those groups
    const { data: userGroups } = await admin
      .from('groups')
      .select('id')
      .eq('created_by', user.id);

    if (userGroups && userGroups.length > 0) {
      const gids = userGroups.map((g) => g.id);
      const { data: grpExpenses } = await admin
        .from('group_expenses')
        .select('id')
        .in('group_id', gids);
      if (grpExpenses && grpExpenses.length > 0) {
        await admin
          .from('group_expense_shares')
          .delete()
          .in('expense_id', grpExpenses.map((e) => e.id));
      }
      await admin.from('group_expenses').delete().in('group_id', gids);
      await admin.from('group_settlements').delete().in('group_id', gids);
      await admin.from('group_invites').delete().in('group_id', gids);
      await admin.from('group_members').delete().in('group_id', gids);
      await admin.from('groups').delete().eq('created_by', user.id);
    }

    // 2. Personal records
    await admin.from('transactions').delete().eq('user_id', user.id);
    await admin.from('reminders').delete().eq('user_id', user.id);
    await admin.from('goals').delete().eq('user_id', user.id);
    await admin.from('categories').delete().eq('user_id', user.id);

    // 3. Profiles table
    await admin.from('profiles').delete().eq('id', user.id);
  } catch (cleanupError) {
    console.error('Error cleaning up user data before deletion:', cleanupError);
  }

  // 4. Delete the auth user from auth.users
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}