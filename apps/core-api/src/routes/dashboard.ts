import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { queryOne, queryAll } from '../db/index.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/dashboard/kpis
router.get('/kpis', (req: Request, res: Response): void => {
  const tenantId = req.user!.tenantId;

  const totalExceptions = queryOne<any>(
    "SELECT COUNT(*) as count FROM exception_cases WHERE tenant_id = ?", [tenantId]
  );
  const openExceptions = queryOne<any>(
    "SELECT COUNT(*) as count FROM exception_cases WHERE tenant_id = ? AND status NOT IN ('RESOLVED','CANCELLED')", [tenantId]
  );
  const pendingApprovals = queryOne<any>(
    "SELECT COUNT(*) as count FROM approvals WHERE tenant_id = ? AND status = 'PENDING'", [tenantId]
  );
  const resolvedThisWeek = queryOne<any>(
    "SELECT COUNT(*) as count FROM exception_cases WHERE tenant_id = ? AND status = 'RESOLVED' AND resolved_at >= datetime('now', '-7 days')", [tenantId]
  );
  const highSeverity = queryOne<any>(
    "SELECT COUNT(*) as count FROM exception_cases WHERE tenant_id = ? AND severity = 'HIGH' AND status NOT IN ('RESOLVED','CANCELLED')", [tenantId]
  );
  const totalEmployees = queryOne<any>(
    "SELECT COUNT(*) as count FROM employees WHERE tenant_id = ? AND employment_status = 'ACTIVE'", [tenantId]
  );
  const recentActivity = queryAll<any>(
    `SELECT al.*, e.first_name || ' ' || e.last_name AS actorName
     FROM audit_logs al
     LEFT JOIN users u ON al.actor_id = u.id
     LEFT JOIN employees e ON u.id = e.user_id
     WHERE al.tenant_id = ?
     ORDER BY al.created_at DESC LIMIT 8`,
    [tenantId]
  );

  const byType = queryAll<any>(
    `SELECT exception_type, COUNT(*) as count 
     FROM exception_cases WHERE tenant_id = ? AND status NOT IN ('RESOLVED','CANCELLED')
     GROUP BY exception_type ORDER BY count DESC`,
    [tenantId]
  );

  const bySeverity = queryAll<any>(
    `SELECT severity, COUNT(*) as count 
     FROM exception_cases WHERE tenant_id = ? AND status NOT IN ('RESOLVED','CANCELLED')
     GROUP BY severity`,
    [tenantId]
  );

  res.json({
    kpis: {
      totalExceptions:    totalExceptions?.count ?? 0,
      openExceptions:     openExceptions?.count ?? 0,
      pendingApprovals:   pendingApprovals?.count ?? 0,
      resolvedThisWeek:   resolvedThisWeek?.count ?? 0,
      highSeverityOpen:   highSeverity?.count ?? 0,
      activeEmployees:    totalEmployees?.count ?? 0,
    },
    exceptionsByType:     byType,
    exceptionsBySeverity: bySeverity,
    recentActivity: recentActivity.map((a) => ({
      ...a,
      before: JSON.parse(a.before_json || 'null'),
      after:  JSON.parse(a.after_json  || 'null'),
    })),
  });
});

export default router;
