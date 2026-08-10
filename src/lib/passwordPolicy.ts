export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_LENGTH_ERROR = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
export const PASSWORD_COMPLEXITY_ERROR = "Password must include at least one letter and one number";
export const PASSWORD_REQUIREMENTS = `Use at least ${MIN_PASSWORD_LENGTH} characters, including a letter and a number.`;

export function isPasswordTooShort(password: string): boolean {
  return password.length < MIN_PASSWORD_LENGTH;
}

export function getPasswordValidationError(password: string): string | null {
  if (isPasswordTooShort(password)) {
    return PASSWORD_LENGTH_ERROR;
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return PASSWORD_COMPLEXITY_ERROR;
  }

  return null;
}
