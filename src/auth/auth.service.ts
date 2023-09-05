import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { GeneratePropelauthLongliveAccessTokenType } from './common/dto/generatePropelauthLongliveAccessToken.dto';

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
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);

            throw 'An error happened in scraper-api async job!';
          }),
        ),
    );

    return response;
  }
}
