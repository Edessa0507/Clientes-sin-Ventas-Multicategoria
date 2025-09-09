export type UserRole = 'admin' | 'supervisor' | 'vendedor';

export interface User {
  id: string;
  codigo: string;
  nombre: string;
  rol: UserRole;
  email?: string;
  zona_id?: string;
  supervisor_id?: string;
  ultimo_login?: string;
  created_at?: string;
}
