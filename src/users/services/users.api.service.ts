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

  async createUserInDatabase(data: CreateUserType) {
    const { email, propelauth_user_id } = data;

    const newUser = await this.pgsql
      .insertInto('users')
      .values({
        employee_id: email,
        propelauth_user_id,
        email,
        temporary_propelauth_user_id: false,
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

  async fetchUserInPropelauthByEmail(email: string) {
    return await propelauth.fetchUserMetadataByEmail(email);
  }

  async createUserInPropelauth(email: string) {
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
      role: 'user',
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
          catchError((error: AxiosError) => {
            this.logger.error(error?.response?.data);

            throw Error('Failed to get user in erp hr v1');
          }),
        ),
    );
  }
}
