export interface User {
  id: string
  email: string
}

export function findUserById(id: string): User | null {
  return { id, email: `${id}@example.com` }
}
