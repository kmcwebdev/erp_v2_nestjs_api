import { User } from '@propelauth/node';

export interface RequestUser extends User {
  original_user_id: string;
  hrbp_approver_email: string;
  user_assigned_role: string;
  permissions: string[];
}
