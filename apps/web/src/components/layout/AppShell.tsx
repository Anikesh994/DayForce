'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, setUser } from '@/lib/auth';
import { setToken } from '@/lib/api';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { Spinner } from '../ui/spinner';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') {
      setReady(true);
      return;
    }
    let user = getUser();
    if (!user) {
      // Auto-initialize demo persona (David Miller - Operations Manager) so app loads immediately
      const demoUser = {
        id: 'user-mgr-ops',
        tenantId: 'tenant-acme-corp',
        email: 'mgr.ops@acme.com',
        displayName: 'David Miller',
        role: 'MANAGER' as const,
        employeeId: 'emp-mgr-ops',
      };
      try {
        setUser(demoUser);
        setToken('demo-jwt-token-mgr-ops');
      } catch (e) {
        console.warn('Storage init warning:', e);
      }
    }
    setReady(true);
  }, [pathname]);

  if (pathname === '/login') return <>{children}</>;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
