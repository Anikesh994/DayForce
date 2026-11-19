'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PunchClockWidget } from '@/components/PunchClockWidget';
import {
  AlertTriangle, CheckCircle2, Clock, Users,
  TrendingUp, FileText, Shield, RefreshCw,
  Sparkles, ArrowRight, Zap, Brain, Activity
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data,     setData]     = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [scanning, setScanning] = useState(false);
  const user = getUser();
  const { success, error: showError } = useToast();
  const canScan = user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';

  async function load() {
    try {
      const d = await api.kpis();
      setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function runScan() {
    setScanning(true);
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() - 14);
    const fmt   = (d: Date) => d.toISOString().slice(0, 10);
    try {
      const r = await api.scan(fmt(start), fmt(today));
      success(
        'Exception Scan Complete',
        `Detected ${r.exceptions} exception(s) across the last 14 days.`
      );
      load();
    } catch (e: any) {
      showError('Scan Failed', e.message);
    }
    setScanning(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-120px)]">
      <div className="text-center animate-fade-in">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 mt-3">Loading dashboard…</p>
      </div>
    </div>
  );

  const kpis = data?.kpis || {};
  const byType = data?.exceptionsByType || [];
  const bySeverity = data?.exceptionsBySeverity || [];
  const activity = data?.recentActivity || [];

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="p-6 space-y-6 max-w-7xl animate-fade-in">
      {/* Welcome Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {user?.displayName?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here&apos;s your workforce attendance overview
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={load}
            className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canScan && (
            <button
              onClick={runScan}
              disabled={scanning}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-60 disabled:shadow-none"
            >
              {scanning ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
              {scanning ? 'Scanning…' : 'Run Exception Scan'}
            </button>
          )}
        </div>
      </div>

      {/* Web Punch Clock for Employees & Self-Service */}
      <PunchClockWidget onPunchSuccess={load} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Open Exceptions"
          value={kpis.openExceptions ?? 0}
          icon={AlertTriangle}
          color="amber"
          subtitle="Needs attention"
        />
        <StatCard
          label="Pending Approvals"
          value={kpis.pendingApprovals ?? 0}
          icon={FileText}
          color="indigo"
          subtitle="Awaiting decision"
        />
        <StatCard
          label="Resolved (7d)"
          value={kpis.resolvedThisWeek ?? 0}
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: 'This week', direction: 'flat' }}
        />
        <StatCard
          label="High Severity"
          value={kpis.highSeverityOpen ?? 0}
          icon={Shield}
          color="red"
          subtitle="Requires urgent review"
        />
        <StatCard
          label="Total Exceptions"
          value={kpis.totalExceptions ?? 0}
          icon={TrendingUp}
          color="slate"
        />
        <StatCard
          label="Active Employees"
          value={kpis.activeEmployees ?? 0}
          icon={Users}
          color="blue"
        />
      </div>

      {/* Agentic Pipeline Status Banner */}
      <Card>
        <CardBody className="p-4">
          <div className="flex items-center gap-6 overflow-x-auto">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Brain className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-slate-800">AI Pipeline</span>
            </div>
            <div className="flex items-center gap-6 text-xs">
              {[
                { label: 'Exception Detection', icon: Zap, color: 'text-amber-600' },
                { label: 'AI Investigation', icon: Brain, color: 'text-indigo-600' },
                { label: 'RAG Policy Lookup', icon: FileText, color: 'text-violet-600' },
                { label: 'Human Approval', icon: CheckCircle2, color: 'text-emerald-600' },
                { label: 'Auto-Correction', icon: Activity, color: 'text-blue-600' },
              ].map((stage, i) => (
                <div key={stage.label} className="flex items-center gap-2 flex-shrink-0">
                  {i > 0 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                  <stage.icon className={`w-3.5 h-3.5 ${stage.color}`} />
                  <span className="text-slate-600 font-medium whitespace-nowrap">{stage.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exceptions by Type */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Open by Type</h3>
              <Link href="/exceptions" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {byType.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No open exceptions"
                description="Run a scan to detect attendance anomalies"
                className="py-6"
              />
            ) : (
              byType.map((item: any) => {
                const total = byType.reduce((s: number, i: any) => s + i.count, 0) || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.exception_type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-700 font-medium">{item.exception_type.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        {/* Exceptions by Severity */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800 text-sm">Severity Distribution</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            {bySeverity.length === 0 ? (
              <EmptyState icon={Shield} title="No severity data" className="py-6" />
            ) : (
              <>
                {/* Visual donut summary */}
                <div className="flex items-center justify-center gap-6 py-2">
                  {bySeverity.map((item: any) => {
                    const colors: Record<string, { bg: string; text: string }> = {
                      HIGH: { bg: 'bg-red-100', text: 'text-red-700' },
                      MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700' },
                      LOW: { bg: 'bg-blue-100', text: 'text-blue-700' },
                    };
                    const c = colors[item.severity] || { bg: 'bg-slate-100', text: 'text-slate-700' };
                    return (
                      <div key={item.severity} className="text-center">
                        <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center mb-1.5`}>
                          <span className={`text-xl font-bold ${c.text}`}>{item.count}</span>
                        </div>
                        <span className={`text-xs font-semibold ${c.text}`}>{item.severity}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Bars */}
                {bySeverity.map((item: any) => {
                  const colors: Record<string, string> = {
                    HIGH: 'bg-red-500', MEDIUM: 'bg-amber-400', LOW: 'bg-blue-400',
                  };
                  const total = bySeverity.reduce((s: number, i: any) => s + i.count, 0) || 1;
                  return (
                    <div key={item.severity}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">{item.severity}</span>
                        <span className="text-slate-500">{Math.round((item.count / total) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[item.severity] || 'bg-slate-400'} transition-all duration-500`}
                             style={{ width: `${(item.count / total) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Recent Activity</h3>
              <Link href="/audit" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                Full log →
              </Link>
            </div>
          </CardHeader>
          <CardBody className="space-y-1 max-h-80 overflow-y-auto">
            {activity.length === 0 ? (
              <EmptyState icon={Activity} title="No recent activity" className="py-6" />
            ) : (
              activity.slice(0, 8).map((log: any, idx: number) => (
                <div key={log.id} className="flex gap-3 py-2.5 group hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="relative flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full ring-4 ring-indigo-50 flex-shrink-0" />
                    {idx < Math.min(activity.length - 1, 7) && (
                      <div className="w-px h-full bg-slate-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{log.action.replace(/_/g,' ')}</span>
                      <Badge variant="muted">{log.entity_type}</Badge>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/exceptions', label: 'Exception Center',  desc: 'Review detected anomalies', icon: AlertTriangle, gradient: 'from-amber-500 to-orange-500' },
          { href: '/approvals',  label: 'Approval Inbox',    desc: 'Pending manager decisions',  icon: CheckCircle2,  gradient: 'from-indigo-500 to-violet-500', roles: ['MANAGER','HR_ADMIN','SYSTEM_ADMIN'] },
          { href: '/attendance', label: 'Attendance Records', desc: 'Clock in/out history',       icon: Clock,         gradient: 'from-blue-500 to-cyan-500' },
          { href: '/audit',      label: 'Audit Trail',        desc: 'Immutable action log',       icon: Shield,        gradient: 'from-slate-500 to-slate-600', roles: ['HR_ADMIN','SYSTEM_ADMIN'] },
        ].filter(({ roles }) => !roles || (user?.role && roles.includes(user.role)))
         .map(({ href, label, desc, icon: Icon, gradient }) => (
          <Link key={href} href={href}>
            <Card hover className="group overflow-hidden">
              <CardBody className="p-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md transition-shadow`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
