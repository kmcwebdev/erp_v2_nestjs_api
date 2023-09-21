import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { UsersApiService } from '../users.api.service';

const TEMPORARY_APPROVER = 'leanna.pedragosa@kmc.solutions';

@Injectable()
export class UserUpdateCronService {
  private readonly logger = new Logger(UserUpdateCronService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersApiService: UsersApiService,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  @Cron(CronExpression.EVERY_12_HOURS)
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

        if (userInErpHrV1.status === 200) {
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
              employee_id: sr || 'Not set in erp hr',
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
