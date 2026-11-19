'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { PunchClockWidget } from '@/components/PunchClockWidget';
import { Clock, Search, RefreshCw, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { clsx } from 'clsx';

function formatLocal(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function duration(inUtc: string | null, outUtc: string | null): string {
  if (!inUtc || !outUtc) return '—';
  const h = (new Date(outUtc).getTime() - new Date(inUtc).getTime()) / 3600000;
  return `${h.toFixed(1)}h`;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await api.attendance({ limit: '200' });
      setRecords(r.records || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = records.filter((r) => {
    const matchSearch = !search || `${r.employeeName} ${r.department}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColor: Record<string, string> = {
    RECORDED: 'bg-slate-100 text-slate-600',
    FLAGGED:  'bg-amber-100 text-amber-700',
    RESOLVED: 'bg-emerald-100 text-emerald-700',
    VERIFIED: 'bg-blue-100 text-blue-700',
  };

  const totalRecords = records.length;
  const flagged = records.filter((r) => r.status === 'FLAGGED').length;
  const missingClockOut = records.filter((r) => r.clock_in_utc && !r.clock_out_utc).length;

  return (
    <div className="p-6 space-y-5 max-w-7xl animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Records</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} records</p>
        </div>
        <button onClick={load} className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Web Punch Clock Widget */}
      <PunchClockWidget onPunchSuccess={load} />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Records" value={totalRecords} icon={Clock} color="blue" />
        <StatCard label="Flagged" value={flagged} icon={AlertTriangle} color="amber" subtitle="Needs review" />
        <StatCard label="Missing Clock-Out" value={missingClockOut} icon={AlertTriangle} color="red" subtitle="No punch out" />
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex gap-3 p-4 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee or department…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="RECORDED">Recorded</option>
            <option value="FLAGGED">Flagged</option>
            <option value="RESOLVED">Resolved</option>
            <option value="VERIFIED">Verified</option>
          </select>
        </CardBody>
      </Card>

      <Card>
        {loading ? (
          <CardBody className="flex justify-center py-16"><Spinner size="lg" /></CardBody>
        ) : filtered.length === 0 ? (
          <CardBody>
            <EmptyState icon={Clock} title="No attendance records" description="Records will appear once the system is seeded and running." />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {['Employee','Dept','Clock In','Clock Out','Duration','Status','Source'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec) => {
                  const isMissingOut = rec.clock_in_utc && !rec.clock_out_utc;
                  const isFlagged = rec.status === 'FLAGGED';
                  return (
                    <tr key={rec.id} className={clsx(
                      'border-b border-slate-50 transition-colors',
                      isFlagged ? 'bg-amber-50/40 hover:bg-amber-50/70' :
                      isMissingOut ? 'bg-red-50/30 hover:bg-red-50/50' :
                      'hover:bg-slate-50',
                    )}>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{rec.employeeName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{rec.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{rec.department}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-700 font-mono">{formatLocal(rec.clock_in_utc)}</td>
                      <td className="px-4 py-3.5 text-xs font-mono">
                        {rec.clock_out_utc ? (
                          <span className="text-slate-700">{formatLocal(rec.clock_out_utc)}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Missing
                          </span>
                        )}
                      </td>
                      <td className={clsx('px-4 py-3.5 text-xs font-semibold', isMissingOut ? 'text-red-500' : 'text-slate-700')}>
                        {duration(rec.clock_in_utc, rec.clock_out_utc)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[rec.status] || 'bg-slate-100 text-slate-600'}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{rec.source?.replace(/_/g,' ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
