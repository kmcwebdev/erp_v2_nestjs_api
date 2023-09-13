import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { ERPHRV1User } from 'src/users/common/interface/erpHrV1User.dto';

@Injectable()
export class UserUpdateCronService {
  private readonly logger = new Logger(UserUpdateCronService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly configService: ConfigService,
  ) {}

  private async fetchUserByEmailInERPHrV1(email: string): Promise<ERPHRV1User> {
    try {
      const NODE_ENV = this.configService.get('NODE_ENV');
      const API_KEY = this.configService.get('ERP_HR_V1_API_KEY');
      const BASE_URL =
        NODE_ENV === 'development'
          ? this.configService.get('ERP_HR_V1_DEV_BASE_URL')
          : this.configService.get('ERP_HR_V1_PROD_BASE_URL');

      const response = await fetch(
        `${BASE_URL}/api/employees/details?email=${email}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-auth': API_KEY,
          },
        },
      );

      const user = await response.json();

      if (!response.ok) {
        throw new Error(user?.message || "Couldn't fetch user");
      }

      return user;
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }

  private async updateUserUsingERPHrV1(data: ERPHRV1User) {
    try {
      const {
        sr,
        name,
        firstName,
        lastName,
        clientId,
        client,
        workEmail,
        hrbpEmail,
        position,
      } = data;

      const updatedUser = await this.pgsql
        .updateTable('users')
        .set({
          employee_id: sr || 'Not set in erp hr',
          full_name: name,
          first_name: firstName,
          last_name: lastName,
          client_id: clientId,
          client_name: client,
          hrbp_approver_email: hrbpEmail,
          position,
        })
        .where('users.email', '=', workEmail)
        .executeTakeFirst();

      return updatedUser;
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    try {
      const outdatedUsers = await this.pgsql
        .selectFrom('users')
        .select(['users.user_id', 'users.email'])
        .where('users.updated_via_cron_erp_hr', '=', false)
        .limit(25)
        .execute();

      outdatedUsers.forEach(async (u) => {
        const userInErpHrV1 = await this.fetchUserByEmailInERPHrV1(u.email);

        if (userInErpHrV1) {
          const {
            sr,
            name,
            firstName,
            lastName,
            clientId,
            client,
            hrbpEmail,
            position,
          } = userInErpHrV1;

          const updatedUser = await this.pgsql
            .updateTable('users')
            .set({
              employee_id: sr || 'Not set in erp hr',
              full_name: name,
              first_name: firstName,
              last_name: lastName,
              client_id: clientId,
              client_name: client,
              hrbp_approver_email: hrbpEmail,
              position: position,
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
