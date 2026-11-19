import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/index.js';

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM_ADMIN';
  employeeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-super-secret-key-attendwise-ai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-secret-internal-service-token-1234';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);

  // Accept internal worker token
  if (token === INTERNAL_TOKEN) {
    req.user = {
      id: 'system-workflow-worker',
      tenantId: 'tenant-acme-corp',
      email: 'workflow@system.internal',
      displayName: 'System Workflow Worker',
      role: 'SYSTEM_ADMIN',
    };
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
}
