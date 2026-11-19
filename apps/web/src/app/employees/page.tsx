'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Users, Search, Briefcase, Mail } from 'lucide-react';
import { clsx } from 'clsx';

export default function EmployeesPage() {
  const [emps, setEmps]   = useState<any[]>([]);
  const [loading, setL]   = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => { api.employees().then((r) => { setEmps(r.employees || []); setL(false); }); }, []);

  const departments = [...new Set(emps.map((e) => e.department).filter(Boolean))];

  const filtered = emps.filter((e) => {
    const matchSearch = !search || `${e.first_name} ${e.last_name} ${e.department} ${e.job_title} ${e.email}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const statusColors: Record<string, { bg: string; dot: string }> = {
    ACTIVE:     { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    TERMINATED: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    ON_LEAVE:   { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex gap-3 p-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, title, or email…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-colors"
            />
          </div>
          <select
            value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </CardBody>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardBody><EmptyState icon={Users} title="No employees found" description="Adjust your search or filters." /></CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((emp, idx) => {
            const sc = statusColors[emp.employment_status] || statusColors.ACTIVE;
            const initials = `${(emp.first_name || '')[0] || ''}${(emp.last_name || '')[0] || ''}`.toUpperCase();
            return (
              <Card key={emp.id} hover className="animate-slide-up" >
                <CardBody className="flex items-start gap-4 p-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{emp.first_name} {emp.last_name}</span>
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', sc.bg)}>
                        <span className={clsx('w-1.5 h-1.5 rounded-full', sc.dot)} />
                        {emp.employment_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Briefcase className="w-3 h-3" />
                      <span>{emp.job_title}</span>
                      <span className="text-slate-300">·</span>
                      <span>{emp.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <Mail className="w-3 h-3" />
                      <span>{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="font-mono bg-slate-50 px-2 py-0.5 rounded">{emp.employee_code}</span>
                      {emp.managerName && <span>Reports to: <span className="font-medium text-slate-700">{emp.managerName}</span></span>}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
