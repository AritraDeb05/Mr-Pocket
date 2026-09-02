// Thin wrappers around the Postgres RPC functions — these return only the
// final computed numbers, never raw transaction rows, so performance stays
// constant regardless of how much transaction history a user has.

export async function getPeriodSummary(supabase, userId, start, end) {
  const { data, error } = await supabase.rpc('get_period_summary', {
    p_user_id: userId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  if (error) {
    console.error('getPeriodSummary error:', error.message);
    return { totalInflow: 0, totalOutflow: 0 };
  }

  const row = data?.[0];
  return {
    totalInflow: Number(row?.total_inflow || 0),
    totalOutflow: Number(row?.total_outflow || 0),
  };
}

export async function getOutflowSum(supabase, userId, start, end, categoryId = null) {
  const { data, error } = await supabase.rpc('get_outflow_sum', {
    p_user_id: userId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_category_id: categoryId,
  });

  if (error) {
    console.error('getOutflowSum error:', error.message);
    return 0;
  }

  return Number(data || 0);
}

export async function getCategoryOutflowTotals(supabase, userId, start, end) {
  const { data, error } = await supabase.rpc('get_category_outflow_totals', {
    p_user_id: userId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });

  if (error) {
    console.error('getCategoryOutflowTotals error:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    categoryId: row.category_id,
    total: Number(row.total),
  }));
}

// Lifetime net = all-time inflow minus all-time outflow, computed entirely
// in Postgres. Uses a very wide date range so it effectively means "all time."
export async function getLifetimeNet(supabase, userId) {
  const start = new Date('2000-01-01');
  const end = new Date('2100-01-01');
  const { totalInflow, totalOutflow } = await getPeriodSummary(supabase, userId, start, end);
  return totalInflow - totalOutflow;
}