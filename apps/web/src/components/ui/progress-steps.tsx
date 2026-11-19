import { clsx } from 'clsx';
import { Check } from 'lucide-react';

export interface Step {
  label: string;
  status: 'completed' | 'active' | 'pending';
  description?: string;
}

export function ProgressSteps({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <div className={clsx('flex items-center gap-1', className)}>
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              step.status === 'completed' && 'bg-emerald-600 text-white',
              step.status === 'active' && 'bg-indigo-600 text-white ring-4 ring-indigo-100',
              step.status === 'pending' && 'bg-slate-200 text-slate-500',
            )}>
              {step.status === 'completed' ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={clsx(
              'text-xs font-medium hidden sm:inline',
              step.status === 'active' ? 'text-indigo-700' : step.status === 'completed' ? 'text-emerald-700' : 'text-slate-400',
            )}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={clsx(
              'w-6 h-0.5 mx-1',
              step.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-200',
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
