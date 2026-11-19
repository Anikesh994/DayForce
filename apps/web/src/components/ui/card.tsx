import { clsx } from 'clsx';

export function Card({ children, className, hover }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={clsx(
      'bg-white rounded-xl border border-slate-200 shadow-sm animate-fade-in',
      hover && 'transition-all duration-200 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5',
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('p-5 border-b border-slate-100', className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('p-5', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl', className)}>{children}</div>;
}
