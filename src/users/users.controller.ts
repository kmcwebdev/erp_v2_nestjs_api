import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UsersApiService } from './services/users.api.service';
import { CreateUserDTO } from 'src/users/common/dto/create-user.dto';
import { Apikey } from 'src/auth/common/decorator/apiKey.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersApiService) {}

  @Post()
  createUserInDatabase(@Body() body: CreateUserDTO) {
    return this.usersService.createOrGetUserInDatabase(body);
  }

  @Apikey()
  @HttpCode(HttpStatus.OK)
  @Post('/propelauth-webhook/create')
  async propelauthCreateWebhook(@Body() body: unknown) {
    console.log(body);

    return {
      message: 'ok',
    };
  }

  @Apikey()
  @Post('/propelauth-webhook/update')
  async propelauthUpdateWebhook(@Body() body: unknown) {
    console.log(body);

    return {
      message: 'ok',
    };
  }
}
