import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { queryAll, queryOne, execute } from '../db/index.js';
import { detectExceptions } from '../domain/exceptionDetector.js';
import { runInvestigationPipeline } from '../domain/investigationRunner.js';
import { publishEvent } from '../events/publisher.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/attendance
router.get('/', (req: Request, res: Response): void => {
  const { employeeId, startDate, endDate, status } = req.query;
  const tenantId = req.user!.tenantId;

  let sql = `
    SELECT a.*, 
           e.first_name || ' ' || e.last_name AS employeeName,
           e.employee_code AS employeeCode,
           e.department,
           s.scheduled_start_utc, s.scheduled_end_utc, s.shift_type
    FROM attendance_records a
    JOIN employees e ON a.employee_id = e.id
    LEFT JOIN shifts s ON a.shift_id = s.id
    WHERE a.tenant_id = ?
  `;
  const params: any[] = [tenantId];

  if (req.user!.role === 'EMPLOYEE') {
    sql += ' AND e.user_id = ?';
    params.push(req.user!.id);
  } else if (req.user!.role === 'MANAGER') {
    const mgr = queryOne<any>('SELECT id FROM employees WHERE user_id = ?', [req.user!.id]);
    if (mgr) {
      sql += ' AND (e.manager_employee_id = ? OR e.user_id = ?)';
      params.push(mgr.id, req.user!.id);
    }
  }

  if (employeeId) { sql += ' AND a.employee_id = ?'; params.push(employeeId); }
  if (status)     { sql += ' AND a.status = ?';      params.push(status); }
  if (startDate)  { sql += ' AND a.created_at >= ?'; params.push(startDate); }
  if (endDate)    { sql += ' AND a.created_at <= ?'; params.push(`${endDate}T23:59:59`); }

  sql += ' ORDER BY a.created_at DESC LIMIT 200';

  const records = queryAll<any>(sql, params);
  res.json({ records, total: records.length });
});

const ScanSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departmentId: z.string().optional(),
});

// POST /api/v1/attendance/scan  — trigger exception detection
router.post('/scan', requireRole('MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const result = ScanSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    return;
  }

  const { startDate, endDate, departmentId } = result.data;
  const tenantId = req.user!.tenantId;

  try {
    const exceptions = await detectExceptions({ tenantId, startDate, endDate, departmentId });

    // Publish to Inngest and run investigation pipeline for detected exceptions
    for (const exc of exceptions) {
      await publishEvent('attendance/exception.detected', {
        tenantId,
        correlationId: `scan-${Date.now()}`,
        exceptionId: exc.id,
        dedupeKey: exc.dedupeKey,
        employeeId: exc.employeeId,
        shiftId: exc.shiftId ?? '',
        exceptionType: exc.exceptionType,
        severity: exc.severity,
        facts: exc.facts,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      // Automatically investigate each newly detected exception to populate approval inbox
      try {
        await runInvestigationPipeline({
          exceptionId: exc.id,
          tenantId,
          correlationId: `scan-${Date.now()}`,
          requestedByUserId: req.user!.id,
        });
      } catch (pipeErr) {
        console.warn(`[scan] Investigation pipeline error for ${exc.id}:`, pipeErr);
      }
    }

    res.json({
      message: `Scan complete. ${exceptions.length} exception(s) detected/updated.`,
      exceptions: exceptions.length,
      details: exceptions.map((e) => ({ id: e.id, type: e.exceptionType, severity: e.severity, employeeId: e.employeeId })),
    });
  } catch (err: any) {
    console.error('[scan] Error:', err);
    res.status(500).json({ error: 'Scan failed', message: err.message });
  }
});

export default router;
