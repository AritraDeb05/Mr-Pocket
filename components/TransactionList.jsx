'use client';

import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/dateFormat';
import { ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from 'lucide-react';

export default function TransactionList({ transactions, categories, onChanged, onEdit }) {
  const supabase = createClient();

  function categoryFor(id) {
    return categories.find((c) => c.id === id);
  }

  async function handleDelete(id) {
    const confirmed = window.confirm('Delete This Transaction? This Cannot Be Undone.');
    if (!confirmed) return;

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      alert(error.message);
    } else {
      onChanged();
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-10 text-center text-ink-400">
        No Transactions Yet. Add Your First One Above.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl2 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-left text-ink-400">
            <tr>
              <th className="pl-5 pr-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">Source/Paid To</th>
              <th className="px-3 py-3 font-medium">Note</th>
              <th className="px-3 py-3 font-medium text-right">Amount</th>
              <th className="pl-3 pr-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const cat = categoryFor(t.category_id);
              return (
                <tr key={t.id} className="border-t border-ink-100 hover:bg-ink-50/50 transition-colors">
                  <td className="pl-5 pr-3 py-3 whitespace-nowrap text-ink-600">
                    {formatDateTime(t.occurred_at)}
                  </td>
                  <td className="px-3 py-3">
                    {t.type === 'inflow' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-inflow w-fit">
                        <ArrowDownCircle size={12} />
                        Inflow
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-outflow w-fit">
                        <ArrowUpCircle size={12} />
                        Outflow
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {cat ? (
                      <span className="flex items-center gap-1.5 text-ink-700">
                        <span
                          className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-ink-600">{t.source_dest || '—'}</td>
                  <td className="px-3 py-3 text-ink-400">{t.note || '—'}</td>
                  <td
                    className={`px-3 py-3 text-right font-semibold whitespace-nowrap ${
                      t.type === 'inflow' ? 'text-inflow' : 'text-outflow'
                    }`}
                  >
                    {t.type === 'inflow' ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
                  </td>
                  <td className="pl-3 pr-5 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(t)}
                        className="p-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg text-ink-400 hover:text-outflow hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}