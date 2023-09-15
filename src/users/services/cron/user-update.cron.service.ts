import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosError } from 'axios';
import { InjectKysely } from 'nestjs-kysely';
import { catchError, firstValueFrom } from 'rxjs';
import { DB } from 'src/common/types';
import { ERPHRV1User } from 'src/users/common/interface/erpHrV1User.dto';

const TEMPORARY_APPROVER = 'leanna.pedragosa@kmc.solutions';

@Injectable()
export class UserUpdateCronService {
  private readonly logger = new Logger(UserUpdateCronService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async fetchUserByEmailInERPHrV1(email: string) {
    const NODE_ENV = this.configService.get('NODE_ENV');
    const API_KEY = this.configService.get('ERP_HR_V1_API_KEY');
    const BASE_URL =
      NODE_ENV === 'development'
        ? this.configService.get('ERP_HR_V1_DEV_BASE_URL')
        : this.configService.get('ERP_HR_V1_PROD_BASE_URL');

    return await firstValueFrom(
      this.httpService
        .get<ERPHRV1User>('/api/employees/details', {
          baseURL: BASE_URL,
          headers: {
            'Content-Type': 'application/json',
            'x-auth': API_KEY,
          },
          params: {
            email,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error?.response?.data);

            throw Error('Failed to get user in erp hr v1');
          }),
        ),
    );
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
