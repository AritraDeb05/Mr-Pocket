export const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'inflow', color: '#10b981' },
  { name: 'Freelance/Business', type: 'inflow', color: '#f97316' },
  { name: 'Other Income', type: 'inflow', color: '#14b8a6' },
  { name: 'Food', type: 'outflow', color: '#ef4444' },
  { name: 'Rent', type: 'outflow', color: '#8b5cf6' },
  { name: 'Transport', type: 'outflow', color: '#2563eb' },
  { name: 'Shopping', type: 'outflow', color: '#ec4899' },
  { name: 'Bills & Utilities', type: 'outflow', color: '#0ea5e9' },
  { name: 'Entertainment', type: 'outflow', color: '#a855f7' },
  { name: 'Other Expense', type: 'outflow', color: '#64748b' },
];

// Creates default categories for a user if they don't have any yet.
// Safe to call from multiple tabs/pages at once: the unique constraint on
// (user_id, name, type) means a duplicate insert is rejected by the database
// rather than silently creating a second row, so we just ignore that specific error.
export async function ensureDefaultCategories(supabase, userId) {
  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (fetchError) {
    console.error('Error checking categories:', fetchError.message);
    return;
  }

  if (existing && existing.length > 0) return;

  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId }));
  const { error: insertError } = await supabase.from('categories').insert(rows);

  if (insertError && insertError.code !== '23505') {
    console.error('Error seeding categories:', insertError.message);
  }
}