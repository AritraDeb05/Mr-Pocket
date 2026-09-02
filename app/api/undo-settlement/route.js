import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Reverses a settlement: deletes both linked personal transactions (payer's
// outflow and receiver's inflow) and the settlement record itself. Only the
// original payer can undo, verified server-side before touching anything.
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

  const { data: settlement, error: fetchError } = await admin
    .from('group_settlements')
    .select('*')
    .eq('id', settlementId)
    .single();

  if (fetchError || !settlement || settlement.paid_by !== user.id) {
    return NextResponse.json({ error: 'Only The Original Payer Can Undo This.' }, { status: 403 });
  }

  if (settlement.payer_transaction_id) {
    await admin.from('transactions').delete().eq('id', settlement.payer_transaction_id);
  }
  if (settlement.receiver_transaction_id) {
    await admin.from('transactions').delete().eq('id', settlement.receiver_transaction_id);
  }

  await admin.from('group_settlements').delete().eq('id', settlementId);

  return NextResponse.json({ success: true });
}