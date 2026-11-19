import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { queryAll } from '../db/index.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/audit
router.get('/', requireRole('HR_ADMIN', 'SYSTEM_ADMIN'), (req: Request, res: Response): void => {
  const tenantId = req.user!.tenantId;
  const { entityType, entityId, limit = '50', offset = '0' } = req.query;

  let sql = 'SELECT * FROM audit_logs WHERE tenant_id = ?';
  const params: any[] = [tenantId];

  if (entityType) { sql += ' AND entity_type = ?'; params.push(entityType); }
  if (entityId)   { sql += ' AND entity_id = ?';   params.push(entityId); }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit as string), parseInt(offset as string));

  const logs = queryAll<any>(sql, params);
  res.json({
    logs: logs.map((l) => ({
      ...l,
      before: JSON.parse(l.before_json || l.before_data || 'null'),
      after:  JSON.parse(l.after_json  || l.after_data  || 'null'),
    })),
  });
});

export default router;
