import { User } from '@propelauth/node';

export interface RequestUser extends User {
  original_user_id: string;
}
