import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { UsersApiService } from '../users.api.service';
import { propelauth } from 'src/auth/common/lib/propelauth';

const TEMPORARY_APPROVER = 'leanna.pedragosa@kmc.solutions';

@Injectable()
export class UserUpdateCronService {
  private readonly logger = new Logger(UserUpdateCronService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersApiService: UsersApiService,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  @Cron('0 */1 * * * *')
  async handleCron() {
    try {
      const outdatedUsers = await this.pgsql
        .selectFrom('users')
        .select(['users.user_id', 'users.email'])
        .where('users.updated_via_cron_erp_hr', '=', false)
        .limit(25)
        .execute();

      const NODE_ENV = this.configService.get('NODE_ENV');

      outdatedUsers.forEach(async (u) => {
        if (NODE_ENV === 'development') return;

        const userInErpHrV1 =
          await this.usersApiService.fetchUserByEmailInERPHrV1(u.email);

        const propelauthUser = await propelauth.fetchUserMetadataByEmail(
          u.email,
        );

        if (userInErpHrV1.status === 200 && propelauthUser) {
          const {
            sr,
            name,
            firstName,
            lastName,
            clientId,
            client,
            hrbpEmail,
            position,
          } = userInErpHrV1.data;

          const updatedUser = await this.pgsql
            .updateTable('users')
            .set({
              propelauth_user_id: propelauthUser.userId,
              employee_id: sr || 'NA',
              full_name: name,
              first_name: firstName,
              last_name: lastName,
              client_id: clientId,
              client_name: client,
              hrbp_approver_email:
                hrbpEmail === 'people@kmc.solutions'
                  ? TEMPORARY_APPROVER
                  : hrbpEmail,
              position,
              temporary_propelauth_user_id: false,
              temporary_employee_id: sr ? false : true,
              updated_via_cron_erp_hr: true,
            })
            .returning(['users.email'])
            .where('users.user_id', '=', u.user_id)
            .executeTakeFirst();

          this.logger.debug('User updated: ' + updatedUser.email);
        }
      });
    } catch (error) {
      this.logger.error(error);
    }
  }
}
