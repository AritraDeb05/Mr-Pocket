export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function equalSplit(amount, userIds) {
  const n = userIds.length;
  if (n === 0) return [];
  const baseCents = Math.floor((amount * 100) / n);
  const totalCents = Math.round(amount * 100);
  let remainder = totalCents - baseCents * n;

  return userIds.map((id) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder--;
    return { user_id: id, share_amount: (baseCents + extra) / 100 };
  });
}

export function validateCustomSplit(amount, shares) {
  const sum = shares.reduce((s, x) => s + Number(x.share_amount || 0), 0);
  return Math.abs(sum - amount) < 0.01;
}

export function computeGroupBalances(expenses, shares, settlements) {
  const balances = {};

  function add(userId, amount) {
    balances[userId] = (balances[userId] || 0) + amount;
  }

  expenses.forEach((exp) => {
    add(exp.paid_by, Number(exp.amount));
  });

  shares.forEach((s) => {
    add(s.user_id, -Number(s.share_amount));
  });

  // FIXED: paying off a debt should move the payer's balance TOWARD zero
  // (less negative), and reduce the receiver's credit (they've now been
  // paid, so they're owed less). The signs were inverted before.
  settlements.forEach((s) => {
    add(s.paid_by, Number(s.amount));   // payer's balance improves
    add(s.paid_to, -Number(s.amount));  // receiver's credit decreases
  });

  return balances;
}

export function simplifyDebts(balances) {
  const creditors = [];
  const debtors = [];

  Object.entries(balances).forEach(([id, amt]) => {
    if (amt > 0.005) creditors.push({ id, amt });
    else if (amt < -0.005) debtors.push({ id, amt: -amt });
  });

  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const result = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amt = Math.min(c.amt, d.amt);

    if (amt > 0.005) {
      result.push({ from: d.id, to: c.id, amount: Math.round(amt * 100) / 100 });
    }

    c.amt -= amt;
    d.amt -= amt;
    if (c.amt <= 0.005) ci++;
    if (d.amt <= 0.005) di++;
  }

  return result;
}