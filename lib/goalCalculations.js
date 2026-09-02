import { getPeriodSummary, getOutflowSum, getCategoryOutflowTotals, getLifetimeNet } from './aggregations';

export function daysBetween(start, end) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(1, Math.round((e - s) / msPerDay) + 1);
}

// Net savings rate over a user-chosen historical window — now a single
// database round-trip instead of downloading and scanning every transaction.
export async function computeSavingsRate(supabase, userId, startDate, endDate) {
  const { totalInflow, totalOutflow } = await getPeriodSummary(supabase, userId, startDate, endDate);
  const days = daysBetween(startDate, endDate);
  const netSavings = totalInflow - totalOutflow;
  const dailyRate = netSavings / days;

  return { totalInflow, totalOutflow, netSavings, days, dailyRate };
}

export function computeTimeToGoal(targetAmount, dailyRate) {
  if (dailyRate <= 0) return null;
  return Math.ceil(targetAmount / dailyRate);
}

// Historical share of outflow per category — one grouped SQL query instead
// of downloading every outflow transaction and grouping in JS.
export async function computeCategoryOutflowWeights(supabase, userId, startDate, endDate, categories) {
  const totals = await getCategoryOutflowTotals(supabase, userId, startDate, endDate);
  const grandTotal = totals.reduce((sum, t) => sum + t.total, 0);

  const result = totals.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return {
      categoryId: t.categoryId || 'uncategorized',
      name: cat ? cat.name : 'Uncategorized',
      color: cat ? cat.color : '#94a3b8',
      share: grandTotal > 0 ? t.total / grandTotal : 0,
      historicalAmount: t.total,
    };
  });

  return result.sort((a, b) => b.share - a.share);
}

export async function computeAvailableToSave(supabase, userId, minBalance) {
  const lifetimeNet = await getLifetimeNet(supabase, userId);
  return lifetimeNet - Number(minBalance || 0);
}

// Progress toward a goal — now a targeted database sum for exactly this
// goal's window, instead of filtering the user's entire transaction history
// in the browser.
export async function computeGoalProgress(supabase, userId, goal) {
  const startingAmount = Number(goal.starting_amount || 0);

  if (goal.type === 'save') {
    const since = new Date(goal.created_at);
    const now = new Date();
    const { totalInflow, totalOutflow } = await getPeriodSummary(supabase, userId, since, now);
    return Math.max(0, startingAmount + totalInflow - totalOutflow);
  }

  if (goal.type === 'limit') {
    const start = goal.start_date ? new Date(goal.start_date) : new Date(goal.created_at);
    const end = goal.deadline ? new Date(goal.deadline) : new Date();
    end.setHours(23, 59, 59, 999);

    const outflow = await getOutflowSum(supabase, userId, start, end, goal.category_id || null);
    return outflow;
  }

  return 0;
}

export function computeDaysRemaining(deadline) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end - today) / msPerDay);
}

// Builds the full "next steps" suggestion for a goal — now composed of a
// small number of targeted aggregate queries instead of scanning the user's
// full transaction history in the browser.
export async function generateGoalSuggestion(supabase, userId, goal, categories) {
  const progress = await computeGoalProgress(supabase, userId, goal);
  const daysRemaining = computeDaysRemaining(goal.deadline);

  if (goal.type === 'save') {
    const remaining = Math.max(0, Number(goal.target_amount) - progress);
    if (remaining === 0) {
      return { status: 'complete', message: 'Goal already reached 🎉' };
    }
    if (daysRemaining === null) {
      return { status: 'no-deadline', remaining, message: `₹${remaining.toFixed(2)} left to save. Add a deadline to get a daily budget.` };
    }
    if (daysRemaining <= 0) {
      return { status: 'overdue', remaining, message: `Deadline passed with ₹${remaining.toFixed(2)} still to save.` };
    }

    const requiredDailySavings = remaining / daysRemaining;

    const lookbackStart = new Date();
    lookbackStart.setDate(lookbackStart.getDate() - 30);
    const since = new Date(goal.created_at);
    const effectiveStart = since > lookbackStart ? since : lookbackStart;
    const { totalOutflow, days } = await computeSavingsRate(supabase, userId, effectiveStart, new Date());
    const avgDailyOutflow = totalOutflow / days;

    const suggestedDailySpend = Math.max(0, avgDailyOutflow - requiredDailySavings);
    const feasible = avgDailyOutflow >= requiredDailySavings;

    const weights = await computeCategoryOutflowWeights(supabase, userId, effectiveStart, new Date(), categories);
    const categoryBreakdown = weights.map((w) => ({
      ...w,
      suggestedAmount: suggestedDailySpend * w.share,
    }));

    return {
      status: feasible ? 'on-track' : 'tight',
      remaining,
      daysRemaining,
      requiredDailySavings,
      suggestedDailySpend,
      categoryBreakdown,
      message: feasible
        ? `Spend up to ₹${suggestedDailySpend.toFixed(2)}/day to save ₹${remaining.toFixed(2)} in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`
        : `Tight goal — you need to save ₹${requiredDailySavings.toFixed(2)}/day, which is more than your recent average daily outflow (₹${avgDailyOutflow.toFixed(2)}). There's no safe discretionary spend left; consider extending the deadline or lowering the target.`,
    };
  }

  if (goal.type === 'limit') {
    const remaining = Math.max(0, Number(goal.target_amount) - progress);
    const overLimit = progress > Number(goal.target_amount);

    if (overLimit) {
      return { status: 'exceeded', progress, message: `Over the limit by ₹${(progress - goal.target_amount).toFixed(2)}.` };
    }
    if (daysRemaining === null) {
      return { status: 'no-deadline', remaining, message: `₹${remaining.toFixed(2)} left within this limit.` };
    }
    if (daysRemaining <= 0) {
      return { status: 'overdue', remaining, message: `Period ended with ₹${remaining.toFixed(2)} of limit unused.` };
    }

    const dailyAllowance = remaining / daysRemaining;
    return {
      status: 'on-track',
      remaining,
      daysRemaining,
      dailyAllowance,
      message: `You can spend up to ₹${dailyAllowance.toFixed(2)}/day for the next ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} and stay within limit.`,
    };
  }

  return { status: 'unknown', message: '' };
}