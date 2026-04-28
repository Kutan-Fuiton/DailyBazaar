/** Generic API list response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Shared user type */
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}
