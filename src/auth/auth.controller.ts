import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GeneratePropelauthLongliveAccessTokenDTO } from './common/dto/generatePropelauthLongliveAccessToken.dto';
import { Apikey } from './common/decorator/apiKey.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Apikey()
  @Post('generate-propelauth-longlive-access-token')
  async generatePropelauthLongliveAcessToken(
    @Body() body: GeneratePropelauthLongliveAccessTokenDTO,
  ) {
    return this.authService.generatePropelauthLongliveAcessToken(body);
  }
}
