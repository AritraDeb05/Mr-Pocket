import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Records the RECEIVER's inflow transaction for a settlement. This needs
// admin privileges because RLS correctly blocks one user from inserting a
// transaction into another user's personal ledger — so this narrow, verified
// server route is the only safe way to do it.
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { settlementId } = await request.json();

  const admin = createAdminClient();

  // Verify this settlement is real and the requester is genuinely its payer
  // before touching the receiver's data.
  const { data: settlement, error: fetchError } = await admin
    .from('group_settlements')
    .select('*')
    .eq('id', settlementId)
    .single();

  if (fetchError || !settlement || settlement.paid_by !== user.id) {
    return NextResponse.json({ error: 'Invalid settlement' }, { status: 403 });
  }

  const { data: txn, error: insertError } = await admin
    .from('transactions')
    .insert({
      user_id: settlement.paid_to,
      type: 'inflow',
      amount: settlement.amount,
      note: `Settlement received (group payment)`,
      occurred_at: settlement.settled_at,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await admin
    .from('group_settlements')
    .update({ receiver_transaction_id: txn.id })
    .eq('id', settlementId);

  return NextResponse.json({ success: true });
}