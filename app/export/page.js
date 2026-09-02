'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buildExportRows, exportAsCSV, exportAsJSON, exportAsExcel, exportAsPDF } from '@/lib/exportData';
import Nav from '@/components/Nav';
import { Download, Calendar, FileSpreadsheet, FileText, FileJson, FileType, User, ChevronLeft, ChevronRight } from 'lucide-react';

const FORMATS = [
  { key: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { key: 'pdf', label: 'PDF', icon: FileType },
  { key: 'csv', label: 'CSV', icon: FileText },
  { key: 'json', label: 'JSON', icon: FileJson },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExportPage() {
  const supabase = createClient();

  const [scope, setScope] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(todayStr());
  const [selectedFormats, setSelectedFormats] = useState({ excel: true, pdf: false, csv: false, json: false });
  const [includeProfile, setIncludeProfile] = useState(false);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      setUserInfo({ name: profile?.full_name || '', email: user.email });
    });
  }, []);

  function toggleFormat(key) {
    setSelectedFormats((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function loadPreview() {
    setError('');
    setLoading(true);
    setCurrentPage(1);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false });

    if (scope === 'range') {
      if (!startDate || !endDate) {
        setError('Pick Both A Start And End Date.');
        setLoading(false);
        return;
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.gte('occurred_at', start.toISOString()).lte('occurred_at', end.toISOString());
    }

    const [{ data: txns }, { data: cats }] = await Promise.all([
      query,
      supabase.from('categories').select('*').eq('user_id', user.id),
    ]);

    const rows = buildExportRows(txns || [], cats || []);
    setAllRows(rows);
    setLoading(false);
  }

  useEffect(() => {
    loadPreview();
  }, [scope, startDate, endDate]);

  async function handleExport() {
    const anyFormatSelected = Object.values(selectedFormats).some(Boolean);
    if (!anyFormatSelected) {
      setError('Select At Least One File Format.');
      return;
    }
    if (allRows.length === 0) {
      setError('No Transactions To Export For This Selection.');
      return;
    }

    setError('');

    const profileInfo = includeProfile ? userInfo : null;

    if (selectedFormats.excel) exportAsExcel(allRows, profileInfo);
    if (selectedFormats.pdf) exportAsPDF(allRows, profileInfo);
    if (selectedFormats.csv) exportAsCSV(allRows, profileInfo);
    if (selectedFormats.json) exportAsJSON(allRows, profileInfo);
  }

  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = allRows.slice(pageStart, pageStart + pageSize);
  const columns = allRows.length > 0 ? Object.keys(allRows[0]) : [];

  function handlePageSizeChange(size) {
    setPageSize(size);
    setCurrentPage(1);
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-ink-900">Export Transactions</h1>

        <div className="bg-white rounded-xl2 shadow-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-brand-600" />
            <h2 className="font-semibold text-ink-900">What To Export</h2>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setScope('all')}
              className={
                scope === 'all'
                  ? 'flex-1 py-2.5 rounded-lg text-sm font-medium border bg-brand-600 text-white border-brand-600'
                  : 'flex-1 py-2.5 rounded-lg text-sm font-medium border text-ink-500 border-ink-200 hover:bg-ink-50'
              }
            >
              Complete History
            </button>
            <button
              onClick={() => setScope('range')}
              className={
                scope === 'range'
                  ? 'flex-1 py-2.5 rounded-lg text-sm font-medium border bg-brand-600 text-white border-brand-600'
                  : 'flex-1 py-2.5 rounded-lg text-sm font-medium border text-ink-500 border-ink-200 hover:bg-ink-50'
              }
            >
              Choose A Period
            </button>
          </div>

          {scope === 'range' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-ink-400">From</label>
                <input
                  type="date"
                  value={startDate}
                  max={todayStr()}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-ink-400">To</label>
                <input
                  type="date"
                  value={endDate}
                  max={todayStr()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl2 shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-ink-900">File Format(s)</h2>
          <p className="text-sm text-ink-400">Select One Or More — All Will Download Together.</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map(({ key, label, icon: Icon }) => {
              const active = selectedFormats[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleFormat(key)}
                  className={
                    active
                      ? 'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border bg-brand-50 text-brand-700 border-brand-200'
                      : 'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border text-ink-500 border-ink-200 hover:bg-ink-50'
                  }
                >
                  <Icon size={16} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl2 shadow-card p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeProfile}
              onChange={(e) => setIncludeProfile(e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="flex items-center gap-2 text-sm text-ink-700">
              <User size={16} className="text-ink-400" />
              Include Name & Email In The Export
            </span>
          </label>
        </div>

        {/* Preview — same table style as TransactionList, paginated instead of scrolling */}
        <div className="bg-white rounded-xl2 shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-ink-900">Preview</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-400">Show</span>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => handlePageSizeChange(size)}
                  className={
                    pageSize === size
                      ? 'px-2.5 py-1 rounded-md text-xs font-medium bg-brand-600 text-white'
                      : 'px-2.5 py-1 rounded-md text-xs font-medium text-ink-500 hover:bg-ink-50'
                  }
                >
                  {size}
                </button>
              ))}
              <span className="text-xs text-ink-400 ml-1">Of {allRows.length}</span>
            </div>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-ink-400">Loading Preview…</p>
          ) : allRows.length === 0 ? (
            <p className="p-6 text-sm text-ink-400">No Transactions Found For This Selection.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-ink-400">
                  <tr>
                    {columns.map((h, i) => (
                      <th
                        key={h}
                        className={`py-3 font-medium ${i === 0 ? 'pl-5 pr-3' : i === columns.length - 1 ? 'pl-3 pr-5 text-right' : 'px-3'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <tr key={i} className="border-t border-ink-100 hover:bg-ink-50/50 transition-colors">
                      {columns.map((h, j) => (
                        <td
                          key={h}
                          className={`py-3 text-ink-600 ${j === 0 ? 'pl-5 pr-3' : j === columns.length - 1 ? 'pl-3 pr-5 text-right font-medium' : 'px-3'}`}
                        >
                          {row[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-ink-100">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span className="text-sm text-ink-400">Page {currentPage} Of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="text-outflow text-sm">{error}</p>}

        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 bg-ink-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-ink-800 transition-colors"
        >
          <Download size={18} />
          Export {Object.values(selectedFormats).filter(Boolean).length || ''} File{Object.values(selectedFormats).filter(Boolean).length === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  );
}