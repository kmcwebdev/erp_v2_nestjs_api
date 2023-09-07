import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { GeneratePropelauthLongliveAccessTokenType } from './common/dto/generatePropelauthLongliveAccessToken.dto';
import { propelauth } from './common/lib/propelauth';

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

    this.logger.log('Generate success for propelauth long live access token');

    return response;
  }

  async changeUserRoleAccessInPropelauth() {
    const updatedUserRole = await propelauth.changeUserRoleInOrg({
      orgId: '',
      userId: '',
      role: '',
    });

    return updatedUserRole;
  }
}
