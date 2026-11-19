import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { queryOne, queryAll } from '../db/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/v1/auth/login
router.post('/login', (req: Request, res: Response): void => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.issues });
    return;
  }

  const user = queryOne<any>(
    'SELECT * FROM users WHERE email = ? AND is_active = 1',
    [result.data.email]
  );

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Demo: accept 'demo1234' password by checking stored hash
  const isValid = result.data.password === 'demo1234' &&
    user.password_hash === 'hashed_demo1234';

  if (!isValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const employee = queryOne<any>('SELECT id FROM employees WHERE user_id = ?', [user.id]);

  const payload = {
    id: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
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
