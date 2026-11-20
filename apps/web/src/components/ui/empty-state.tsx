import { clsx } from 'clsx';
import React from 'react';

interface EmptyStateProps {
  icon?: React.ElementType;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, illustration, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-10 px-6 animate-fade-in text-center', className)}>
      {illustration ? (
        <div className="mb-2 flex items-center justify-center">{illustration}</div>
      ) : Icon ? (
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
          <Icon className="w-7 h-7 text-slate-400" />
        </div>
      ) : null}
      <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
