import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UsersApiService } from './services/users.api.service';
import { CreateUserDTO } from 'src/users/common/dto/create-user.dto';
import { PropelauthGuard } from 'src/auth/common/guard/propelauth.guard';
import { Apikey } from 'src/auth/common/decorator/apiKey.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersApiService) {}

  @Post()
  @UseGuards(PropelauthGuard)
  createUserInDatabase(@Body() body: CreateUserDTO) {
    return this.usersService.createUserInDatabase(body);
  }

  @Apikey()
  @Post('/propelauth-webhook/create')
  // TODO: Create DTO for this
  async propelauthCreateWebhook(
    @Body() body: { user_id: string; email: string },
  ) {
    await this.usersService.createUserInDatabase({
      propelauth_user_id: body.user_id,
      email: body.email,
    });

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
