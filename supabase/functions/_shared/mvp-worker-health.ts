export function workflowWorkerAvailable(secret: string, lastSeen: string | null | undefined, now = Date.now()): boolean {
  if (secret.length < 32 || !lastSeen) return false;
  const age = now - Date.parse(lastSeen);
  return Number.isFinite(age) && age >= -30_000 && age <= 120_000;
}
