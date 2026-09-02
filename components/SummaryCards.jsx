import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export default function SummaryCards({ totalInflow, totalOutflow }) {
  const net = totalInflow - totalOutflow;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div className="bg-white rounded-xl2 shadow-card p-4">
        <div className="flex items-center gap-2 text-ink-400 mb-1">
          <TrendingUp size={14} />
          <p className="text-xs font-medium uppercase tracking-wide">Inflow</p>
        </div>
        <p className="text-2xl font-bold text-inflow">₹{totalInflow.toFixed(2)}</p>
      </div>

      <div className="bg-white rounded-xl2 shadow-card p-4">
        <div className="flex items-center gap-2 text-ink-400 mb-1">
          <TrendingDown size={14} />
          <p className="text-xs font-medium uppercase tracking-wide">Outflow</p>
        </div>
        <p className="text-2xl font-bold text-outflow">₹{totalOutflow.toFixed(2)}</p>
      </div>

      <div className="bg-white rounded-xl2 shadow-card p-4">
        <div className="flex items-center gap-2 text-ink-400 mb-1">
          <Wallet size={14} />
          <p className="text-xs font-medium uppercase tracking-wide">Net</p>
        </div>
        <p className={`text-2xl font-bold ${net >= 0 ? 'text-inflow' : 'text-outflow'}`}>
          {net >= 0 ? '+' : ''}₹{net.toFixed(2)}
        </p>
      </div>
    </div>
  );
}