'use client';
import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;           // e.g. 'indigo', 'emerald', 'amber', 'red'
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  subtitle?: string;
  onClick?: () => void;
}

const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'ring-amber-100' },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  ring: 'ring-indigo-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  red:     { bg: 'bg-red-50',     icon: 'text-red-600',     ring: 'ring-red-100' },
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    ring: 'ring-blue-100' },
  slate:   { bg: 'bg-slate-50',   icon: 'text-slate-600',   ring: 'ring-slate-100' },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  ring: 'ring-violet-100' },
};

export function StatCard({ label, value, icon: Icon, color, trend, subtitle, onClick }: StatCardProps) {
  const c = colorMap[color] || colorMap.slate;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-all duration-200 animate-slide-up',
        onClick && 'cursor-pointer hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('p-2.5 rounded-xl ring-1', c.bg, c.ring)}>
          <Icon className={clsx('w-5 h-5', c.icon)} />
        </div>
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
            trend.direction === 'up' && 'text-emerald-700 bg-emerald-50',
            trend.direction === 'down' && 'text-red-700 bg-red-50',
            trend.direction === 'flat' && 'text-slate-500 bg-slate-50',
          )}>
            {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend.direction === 'flat' && <Minus className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
      {subtitle && <div className="text-[11px] text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}
