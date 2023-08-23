export interface User {
  user_id: string;
  propelauth_user_id: string;
  employee_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  client_id: string;
  client_name: string;
  temporary_propelauth_user_id: boolean;
  created_at: number;
  position: string | null;
}
