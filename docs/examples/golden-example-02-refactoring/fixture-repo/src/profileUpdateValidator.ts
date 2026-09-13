export function validateProfileUpdate(email: string, password: string): string[] {
  const errors: string[] = []
  if (!email.includes('@')) errors.push('email must contain @')
  if (password && password.length < 8) errors.push('password must be at least 8 characters')
  return errors
}
