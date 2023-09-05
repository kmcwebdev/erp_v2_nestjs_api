import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UsersApiService } from './services/users.api.service';
import { CreateUserDTO } from 'src/users/common/dto/createUser.dto';
import { PropelauthGuard } from 'src/auth/common/guard/propelauth.guard';
import { IsApiKey } from 'src/auth/common/decorator/apiKey.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersApiService) {}

  @Post()
  @UseGuards(PropelauthGuard)
  createUser(@Body() body: CreateUserDTO) {
    return this.usersService.createUser(body);
  }

  @IsApiKey()
  @Post('/propelauth-webhook/update')
  async propelauthWebhookTest(@Body() body: unknown) {
    console.log(body);

    return {
      message: 'ok',
    };
  }
}
