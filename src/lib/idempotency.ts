const sanitizeKeyPart = (value: string): string =>
  value.replace(/[^a-zA-Z0-9:_-]/g, '-').slice(0, 120);

export const createIdempotencyKey = (prefix: string, operationId?: string): string => {
  const safePrefix = sanitizeKeyPart(prefix || 'operation');
  const rawOperationId =
    operationId?.trim() ||
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  return `${safePrefix}:${sanitizeKeyPart(rawOperationId)}`;
};
