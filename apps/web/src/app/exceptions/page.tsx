'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardBody } from '@/components/ui/card';
import { Badge, severityBadge, statusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertTriangle, Search, RefreshCw, ChevronRight, Filter, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function ExceptionsPage() {
  const [data,    setData]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [type,    setType]    = useState('');
  const [severity,setSeverity]= useState('');

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (status)   params.status   = status;
      if (type)     params.type     = type;
      if (severity) params.severity = severity;
      const r = await api.exceptions(params);
      setData(r.exceptions || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [status, type, severity]);

  const filtered = data.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.employeeName?.toLowerCase().includes(q) ||
      e.exception_type?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  });

  const hasFilters = !!status || !!type || !!severity;
  const TYPES = ['MISSING_CLOCK_OUT','MISSING_CLOCK_IN','LATE_ARRIVAL','EARLY_DEPARTURE','OVERTIME_REVIEW','SHIFT_CONFLICT'];
  const STATUSES = ['DETECTED','INVESTIGATING','WAITING_FOR_APPROVAL','APPROVED','RESOLVED','REJECTED','CANCELLED'];

  function clearFilters() {
    setStatus(''); setType(''); setSeverity(''); setSearch('');
  }

  const selectClass = "px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none cursor-pointer hover:border-slate-300 transition-colors";

  return (
    <div className="p-6 space-y-5 max-w-7xl animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exception Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} exception{filtered.length !== 1 ? 's' : ''}
            {hasFilters && <span className="text-indigo-600"> (filtered)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
          <button onClick={load} className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-wrap gap-3 p-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, type, or department…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-colors"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
            <option value="">All Types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectClass}>
            <option value="">All Severities</option>
            <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
          </select>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <CardBody className="flex justify-center py-16"><Spinner size="lg" /></CardBody>
        ) : filtered.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={AlertTriangle}
              title="No exceptions found"
              description={hasFilters ? 'Try adjusting your filters' : 'Run a scan from the dashboard to detect attendance anomalies'}
              action={hasFilters ? (
                <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  Clear all filters
                </button>
              ) : undefined}
            />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {['Employee','Dept','Type','Severity','Status','Detected',''].map((h) => (
                    <th key={h || 'action'} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((exc, idx) => (
                  <tr
                    key={exc.id}
                    className="border-b border-slate-50 table-row-interactive group"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{exc.employeeName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{exc.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{exc.department}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-700">{exc.exception_type?.replace(/_/g,' ')}</span>
                    </td>
                    <td className="px-4 py-3.5">{severityBadge(exc.severity)}</td>
                    <td className="px-4 py-3.5">{statusBadge(exc.status)}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {new Date(exc.detected_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/exceptions/${exc.id}`}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
