'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Bell, CheckCheck, RefreshCw, AlertTriangle, Info, CheckCircle2, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';

export default function NotificationsPage() {
  const [notifs,  setNotifs]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'all' | 'unread'>('all');
  const { success } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await api.notifications();
      setNotifs(r.notifications || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function markRead(id: string) {
    await api.markRead(id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, status: 'READ' } : n));
    success('Notification marked as read');
  }

  async function markAllRead() {
    const unread = notifs.filter((n) => n.status === 'UNREAD');
    for (const n of unread) {
      await api.markRead(n.id);
    }
    setNotifs((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
    success('All notifications marked as read');
  }

  useEffect(() => { load(); }, []);

  const unreadCount = notifs.filter((n) => n.status === 'UNREAD').length;
  const display = filter === 'unread' ? notifs.filter((n) => n.status === 'UNREAD') : notifs;

  const typeIcon = (type: string) => {
    if (type?.includes('EXCEPTION') || type?.includes('ALERT')) return AlertTriangle;
    if (type?.includes('APPROVAL')) return CheckCircle2;
    if (type?.includes('INFO')) return Info;
    return MessageSquare;
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">{unreadCount} unread</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 hover:bg-indigo-50 rounded-lg transition-colors">
              Mark all read
            </button>
          )}
          <div className="flex border border-slate-200 rounded-xl overflow-hidden">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                  filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Card>
        {loading ? (
          <CardBody className="flex justify-center py-16"><Spinner size="lg" /></CardBody>
        ) : display.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={Bell}
              title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              description="You're all caught up!"
            />
          </CardBody>
        ) : (
          <div className="divide-y divide-slate-100">
            {display.map((n, idx) => {
              const Icon = typeIcon(n.type);
              return (
                <div
                  key={n.id}
                  className={clsx(
                    'flex gap-4 px-5 py-4 transition-colors animate-fade-in',
                    n.status === 'UNREAD' ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : 'bg-white hover:bg-slate-50',
                  )}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                    n.status === 'UNREAD' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400',
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className={clsx('text-sm font-semibold', n.status === 'UNREAD' ? 'text-slate-900' : 'text-slate-600')}>
                        {n.title}
                      </div>
                      <div className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0">
                        {new Date(n.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{n.body}</p>
                    {n.related_entity_type && (
                      <div className="text-xs text-slate-400 mt-1.5 font-mono bg-slate-50 inline-block px-2 py-0.5 rounded">
                        {n.related_entity_type} · {n.related_entity_id?.slice(0, 16)}
                      </div>
                    )}
                  </div>
                  {n.status === 'UNREAD' && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 p-2 rounded-lg flex-shrink-0 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
