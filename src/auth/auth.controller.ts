import { Body, Controller, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GeneratePropelauthLongliveAccessTokenDTO } from './common/dto/generatePropelauthLongliveAccessToken.dto';
import { Apikey } from './common/decorator/apiKey.decorator';
import { UpdatePropelauthUserRoleDTO } from './common/dto/updatePropelauthUserRole.dto';
import { RequestUser } from './common/interface/propelauthUser.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Apikey()
  @Post('/user/generate-propelauth-longlive-access-token')
  async generatePropelauthLongliveAcessToken(
    @Body() body: GeneratePropelauthLongliveAccessTokenDTO,
  ) {
    return this.authService.generatePropelauthLongliveAcessToken(body);
  }

  @Patch('/user/change-user-role-access-in-propelauth')
  async changeUserRoleAccessInPropelauth(
    @Req() req: Request,
    @Body() body: UpdatePropelauthUserRoleDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.authService.changeUserRoleAccessInPropelauth(user, body);
  }
}
