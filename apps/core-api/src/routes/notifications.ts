import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { queryAll, execute } from '../db/index.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/notifications
router.get('/', (req: Request, res: Response): void => {
  const { status } = req.query;
  let sql = 'SELECT * FROM notifications WHERE recipient_user_id = ?';
  const params: any[] = [req.user!.id];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT 50';
  res.json({ notifications: queryAll<any>(sql, params) });
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
