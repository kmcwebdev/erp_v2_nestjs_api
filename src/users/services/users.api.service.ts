import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { AxiosError } from 'axios';
import { propelauth } from 'src/auth/common/lib/propelauth';
import { CreateUserType } from 'src/users/common/dto/create-user.dto';
import { ERPHRV1User } from '../common/interface/erpHrV1User.dto';

@Injectable()
export class UsersApiService {
  private readonly logger = new Logger(UsersApiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  async getUsers() {
    return null;
    ``;
  }

  async createOrGetUserInDatabase(data: CreateUserType) {
    const { email, propelauth_user_id } = data;

    const newUser = await this.pgsql
      .insertInto('users')
      .values({
        employee_id: email,
        propelauth_user_id,
        email,
        temporary_propelauth_user_id: false,
      })
      .returning(['users.user_id', 'users.email', 'users.full_name'])
      .onConflict((oc) => oc.column('email').doNothing())
      .executeTakeFirst();

    if (!newUser) {
      const userTransaction = await this.pgsql
        .transaction()
        .execute(async (trx) => {
          const user = await trx
            .selectFrom('users')
            .select(['users.user_id', 'users.email', 'users.full_name'])
            .where('users.email', '=', email)
            .executeTakeFirst();

          const erpV1User = await this.fetchUserByEmailInERPHrV1(user.email);

          const {
            sr,
            name,
            firstName,
            lastName,
            clientId,
            client,
            hrbpEmail,
            position,
          } = erpV1User.data;

          await trx
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
                  ? 'christian.sulit@kmc.solutions'
                  : hrbpEmail,
              position,
              updated_via_cron_erp_hr: true,
            })
            .where('users.user_id', '=', user.user_id)
            .execute();

          return user;
        });

      return userTransaction;
    }

    return newUser;
  }

  async fetchUserInPropelauthByEmail(email: string) {
    return await propelauth.fetchUserMetadataByEmail(email);
  }

  async createUserInPropelauth(email: string, role?: string) {
    if (!role) role = 'Member';

    const temporaryPassword = String(new Date());

    const isKmcSolutions = email.includes('@kmc.solutions');

    const orgId = isKmcSolutions
      ? this.configService.get('PROPELAUTH_SOLUTIONS_ORG_ID')
      : this.configService.get('PROPELAUTH_EXTERNAL_ORG_ID');

    const newPropelauthUser = await propelauth.createUser({
      email: email,
      password: temporaryPassword,
      askUserToUpdatePasswordOnLogin: true,
      sendEmailToConfirmEmailAddress: true,
    });

    await propelauth.addUserToOrg({
      userId: newPropelauthUser.userId,
      orgId,
      role,
    });

    return Object.assign(newPropelauthUser, { temporaryPassword });
  }

  async fetchUserByEmailInERPHrV1(email: string) {
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
          // catchError((error: AxiosError) => {
          //   this.logger.error(error?.response?.data);

          //   throw Error('Failed to get user in erp hr v1');
          // }),
        ),
    );
  }
}
