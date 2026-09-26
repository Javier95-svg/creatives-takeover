import { isUserType, type UserType } from './accountTypes.ts';

export interface PulseScope {
  version: 1;
  userType: UserType;
  projectId: string | null;
}

export const PULSE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function pulseScope(userType: UserType, projectId: string | null): PulseScope {
  return { version: 1, userType, projectId: userType === 'founder' || userType === 'builder' ? projectId : null };
}

export function readPulseScope(value: unknown): PulseScope | null {
  if (!value || typeof value !== 'object') return null;
  const scope = value as Record<string, unknown>;
  if (scope.version !== 1 || !isUserType(scope.userType)) return null;
  if (scope.projectId !== null && (typeof scope.projectId !== 'string' || !PULSE_UUID.test(scope.projectId))) return null;
  if (scope.userType !== 'founder' && scope.userType !== 'builder' && scope.projectId !== null) return null;
  return { version: 1, userType: scope.userType, projectId: scope.projectId as string | null };
}

export function samePulseScope(a: PulseScope | null, b: PulseScope | null): boolean {
  return Boolean(a && b && a.version === b.version && a.userType === b.userType && a.projectId === b.projectId);
}
