export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_LENGTH_ERROR = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;

export function isPasswordTooShort(password: string): boolean {
  return password.length < MIN_PASSWORD_LENGTH;
}
