'use client';

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM_ADMIN';
  employeeId?: string;
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('aw_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setUser(user: AuthUser) {
  localStorage.setItem('aw_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('aw_token');
  localStorage.removeItem('aw_user');
}
