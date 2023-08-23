import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/@types';
import { CreateUserType } from 'src/users/common/dto/createUser.dto';

@Injectable()
export class UsersApiService {
  private readonly logger = new Logger(UsersApiService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async getUsers() {
    return null;
  }

  async createUser(data: CreateUserType) {
    const { email } = data;

    const newUser = await this.pgsql
      .insertInto('users')
      .values({
        employee_id: email,
        email,
      })
      .returning('user_id')
      .onConflict((oc) => oc.column('email').doNothing())
      .executeTakeFirst();

    if (!newUser) {
      const user = await this.pgsql
        .selectFrom('users')
        .select('user_id')
        .where('users.email', '=', email)
        .executeTakeFirst();

      return user;
    }

    return newUser;
  }
}
