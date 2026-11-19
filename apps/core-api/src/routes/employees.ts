import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { queryAll, queryOne } from '../db/index.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/employees
router.get('/', (req: Request, res: Response): void => {
  const { department } = req.query;
  const tenantId = req.user!.tenantId;

  let sql = `
    SELECT e.*, u.role as userRole,
           m.first_name || ' ' || m.last_name AS managerName
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN employees m ON e.manager_employee_id = m.id
    WHERE e.tenant_id = ?
  `;
  const params: any[] = [tenantId];

  if (department) {
    sql += ' AND e.department = ?';
    params.push(department);
  }

  // Employees can only see themselves
  if (req.user!.role === 'EMPLOYEE') {
    sql += ' AND e.user_id = ?';
    params.push(req.user!.id);
  }

  // Manager sees their direct reports + themselves
  if (req.user!.role === 'MANAGER') {
    const mgr = queryOne<any>('SELECT id FROM employees WHERE user_id = ?', [req.user!.id]);
    if (mgr) {
      sql += ' AND (e.manager_employee_id = ? OR e.user_id = ?)';
      params.push(mgr.id, req.user!.id);
    }
  }

  sql += ' ORDER BY e.last_name ASC';

  const employees = queryAll<any>(sql, params);
  res.json({ employees, total: employees.length });
});

// GET /api/v1/employees/:id
router.get('/:id', (req: Request, res: Response): void => {
  const emp = queryOne<any>(
    `SELECT e.*, m.first_name || ' ' || m.last_name AS managerName, u.role as userRole
     FROM employees e
     LEFT JOIN employees m ON e.manager_employee_id = m.id
     LEFT JOIN users u ON e.user_id = u.id
     WHERE e.id = ? AND e.tenant_id = ?`,
    [req.params.id, req.user!.tenantId]
  );

  if (!emp) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  // Employees can only see themselves
  if (req.user!.role === 'EMPLOYEE' && emp.user_id !== req.user!.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json({ employee: emp });
});

export default router;
