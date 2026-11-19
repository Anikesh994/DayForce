import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { queryOne, queryAll, execute } from '../db/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN']).optional(),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
  displayName: z.string().min(2),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN']).default('EMPLOYEE'),
  department: z.string().optional(),
});

// POST /api/v1/auth/register — Sign up / Sign in with role
router.post('/register', (req: Request, res: Response): void => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    return;
  }

  const { email, password, displayName, role, department } = result.data;
  const tenantId = 'tenant-acme-corp';

  // Check if email already exists
  const existing = queryOne<any>('SELECT id FROM users WHERE email = ?', [email]);
  let userId: string;

  if (existing) {
    userId = existing.id;
    execute(
      "UPDATE users SET display_name = ?, role = ?, password_hash = ? WHERE id = ?",
      [displayName, role, `hashed_${password}`, userId]
    );
  } else {
    userId = `user-${Date.now().toString(36)}`;
    execute(
      `INSERT INTO users (id, tenant_id, email, display_name, role, is_active, password_hash)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [userId, tenantId, email, displayName, role, `hashed_${password}`]
    );
  }

  let emp = queryOne<any>('SELECT id FROM employees WHERE user_id = ?', [userId]);
  if (!emp && (role === 'EMPLOYEE' || role === 'MANAGER')) {
    const empId = `emp-${Date.now().toString(36)}`;
    const [firstName, ...lastNames] = displayName.split(' ');
    execute(
      `INSERT INTO employees (id, tenant_id, user_id, employee_code, first_name, last_name, email, department, job_title, timezone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'America/New_York')`,
      [
        empId,
        tenantId,
        userId,
        `E${Math.floor(100 + Math.random() * 900)}`,
        firstName || 'Employee',
        lastNames.join(' ') || 'User',
        email,
        department || (role === 'MANAGER' ? 'Management' : 'Operations'),
        role === 'MANAGER' ? 'Team Manager' : 'Team Member',
      ]
    );
    emp = { id: empId };
  }

  const payload = {
    id: userId,
    tenantId,
    email,
    displayName,
    role,
    employeeId: emp?.id,
  };

  res.status(201).json({
    token: signToken(payload),
    user: payload,
    message: 'User registered successfully',
  });
});

// POST /api/v1/auth/login
router.post('/login', (req: Request, res: Response): void => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    return;
  }

  const { email, password, role: requestedRole } = result.data;

  const user = queryOne<any>(
    'SELECT * FROM users WHERE email = ? AND is_active = 1',
    [email]
  );

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials. User not found.' });
    return;
  }

  // Accept demo1234 or stored password
  const isValid = password === 'demo1234' ||
    user.password_hash === `hashed_${password}` ||
    user.password_hash === 'hashed_demo1234';

  if (!isValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const effectiveRole = requestedRole || user.role;
  const employee = queryOne<any>('SELECT id FROM employees WHERE user_id = ?', [user.id]);

  const payload = {
    id: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    displayName: user.display_name,
    role: effectiveRole,
    employeeId: employee?.id,
  };

  res.json({
    token: signToken(payload),
    user: payload,
  });
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  res.json({ user: req.user });
});

// GET /api/v1/auth/demo-users  — dev only
router.get('/demo-users', (_req: Request, res: Response): void => {
  const users = queryAll<any>(
    'SELECT id, email, display_name, role FROM users WHERE is_active = 1 ORDER BY role ASC'
  );
  res.json({
    note: 'Development demo only — password for all: demo1234',
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
    })),
  });
});

export default router;
