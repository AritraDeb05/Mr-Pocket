'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getPeriodRange, buildTrendBuckets } from '@/lib/dateRanges';
import { getPeriodSummary, getCategoryOutflowTotals, getLifetimeNet } from '@/lib/aggregations';
import Nav from '@/components/Nav';
import PeriodSelector from '@/components/PeriodSelector';
import SummaryCards from '@/components/SummaryCards';
import ChartsSection from '@/components/ChartsSection';
import { Wallet } from 'lucide-react';

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState('weekly');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [categories, setCategories] = useState([]);
  const [periodTransactions, setPeriodTransactions] = useState([]);
  const [totalInflow, setTotalInflow] = useState(0);
  const [totalOutflow, setTotalOutflow] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [lifetimeNet, setLifetimeNet] = useState(0);

  const { start, end, label } = useMemo(
    () => getPeriodRange(periodType, referenceDate),
    [periodType, referenceDate]
  );

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: cats }, { data: periodTxns }, summary, catTotals, net] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('occurred_at', start.toISOString())
        .lte('occurred_at', end.toISOString())
        .order('occurred_at', { ascending: true }),
      getPeriodSummary(supabase, user.id, start, end),
      getCategoryOutflowTotals(supabase, user.id, start, end),
      getLifetimeNet(supabase, user.id),
    ]);

    setCategories(cats || []);
    setPeriodTransactions(periodTxns || []);
    setTotalInflow(summary.totalInflow);
    setTotalOutflow(summary.totalOutflow);
    setLifetimeNet(net);

    const breakdown = catTotals.map((t) => {
      const cat = (cats || []).find((c) => c.id === t.categoryId);
      return {
        name: cat ? cat.name : 'Uncategorized',
        color: cat ? cat.color : '#94a3b8',
        value: t.total,
      };
    });
    setCategoryBreakdown(breakdown);

    setLoading(false);
  }, [supabase, start, end]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const trendBuckets = useMemo(
    () => buildTrendBuckets(periodType, start, end, periodTransactions),
    [periodType, start, end, periodTransactions]
  );

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
          <div className="flex items-center gap-3 bg-white rounded-xl2 shadow-card px-4 py-2.5">
            <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <Wallet size={16} />
            </span>
            <div>
              <p className="text-xs text-ink-400 leading-tight">Current Net Balance</p>
              <p className={`text-lg font-bold leading-tight ${lifetimeNet >= 0 ? 'text-inflow' : 'text-outflow'}`}>
                ₹{lifetimeNet.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <PeriodSelector
          periodType={periodType}
          referenceDate={referenceDate}
          label={label}
          onPeriodTypeChange={setPeriodType}
          onReferenceDateChange={setReferenceDate}
        />

        {loading ? (
          <div className="text-ink-400 p-8 text-center">Loading…</div>
        ) : (
          <>
            <SummaryCards totalInflow={totalInflow} totalOutflow={totalOutflow} />
            <ChartsSection trendBuckets={trendBuckets} categoryBreakdown={categoryBreakdown} />
          </>
        )}

        <a href="/transactions" className="inline-block text-sm text-brand-600 hover:underline">
          Manage Transactions →
        </a>
      </div>
    </div>
  );
}