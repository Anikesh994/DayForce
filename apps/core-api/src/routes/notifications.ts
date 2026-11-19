import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { queryAll, execute } from '../db/index.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/notifications
router.get('/', (req: Request, res: Response): void => {
  const { status } = req.query;
  const role = req.user!.role;
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  let sql: string;
  const params: any[] = [];

  if (role === 'HR_ADMIN' || role === 'SYSTEM_ADMIN') {
    // HR and Admins see organization-wide notifications
    sql = 'SELECT * FROM notifications WHERE tenant_id = ?';
    params.push(tenantId);
  } else if (role === 'MANAGER') {
    // Managers see notifications directed to them or approval requests
    sql = 'SELECT * FROM notifications WHERE (recipient_user_id = ? OR type = "APPROVAL_REQUESTED" OR type = "EXCEPTION_DETECTED") AND tenant_id = ?';
    params.push(userId, tenantId);
  } else {
    // Employees see notifications directed to them
    sql = 'SELECT * FROM notifications WHERE recipient_user_id = ? AND tenant_id = ?';
    params.push(userId, tenantId);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';
  res.json({ notifications: queryAll<any>(sql, params) });
});

// POST /api/v1/notifications/mark-all-read
router.post('/mark-all-read', (req: Request, res: Response): void => {
  execute(
    "UPDATE notifications SET status = 'READ', read_at = datetime('now') WHERE (recipient_user_id = ? OR tenant_id = ?) AND status = 'UNREAD'",
    [req.user!.id, req.user!.tenantId]
  );
  res.json({ message: 'All notifications marked as read' });
});

// POST /api/v1/notifications/create-test — generate a live notification
router.post('/create-test', (req: Request, res: Response): void => {
  const id = `notif-test-${Date.now().toString(36)}`;
  execute(
    `INSERT INTO notifications
       (id, tenant_id, recipient_user_id, type, title, body, idempotency_key, status, created_at)
     VALUES (?, ?, ?, 'SYSTEM_ALERT', 'Live System Notification', 'Attendance scan completed: all records verified.', ?, 'UNREAD', datetime('now'))`,
    [id, req.user!.tenantId, req.user!.id, `key-${id}`]
  );
  res.json({ success: true, message: 'Test notification created', id });
});

// POST /api/v1/notifications/:id/read
router.post('/:id/read', (req: Request, res: Response): void => {
  execute(
    "UPDATE notifications SET status = 'READ', read_at = datetime('now') WHERE id = ? AND recipient_user_id = ?",
    [req.params.id, req.user!.id]
  );
  res.json({ message: 'Marked as read' });
});

export default router;
