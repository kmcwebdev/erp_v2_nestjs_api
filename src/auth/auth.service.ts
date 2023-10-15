import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { GeneratePropelauthLongliveAccessTokenType } from './common/dto/generate-propelauth-longlive-access-token.dto';
import { propelauth } from './common/lib/propelauth';
import { RequestUser } from './common/interface/propelauthUser.interface';
import { UpdatePropelauthUserRoleType } from './common/dto/update-propelauth-user-role.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async generatePropelauthLongliveAcessToken(
    data: GeneratePropelauthLongliveAccessTokenType,
  ) {
    const { data: response } = await firstValueFrom(
      this.httpService
        .post(
          '/api/backend/v1/access_token',
          {
            duration_in_minutes: 3600,
            user_id: data.user_id,
          },
          {
            baseURL: this.configService.get('PROPELAUTH_AUTH_URL'),
            headers: {
              Authorization: `Bearer ${this.configService.get(
                'PROPELAUTH_API_KEY',
              )}`,
            },
          },
        )
        .pipe(
          catchError(() => {
            throw 'Failed to generate long live access token';
          }),
        ),
    );

    this.logger.log('Generate propelauth long live access token success');

    return response;
  }

  async changeUserRoleAccessInPropelauth(
    user: RequestUser,
    data: UpdatePropelauthUserRoleType,
  ) {
    const updatedUserRole = await propelauth.changeUserRoleInOrg({
      orgId: data.org_id,
      userId: data?.user_id ? data.user_id : user.userId,
      role: data.role,
    });

    return updatedUserRole;
  }
}
