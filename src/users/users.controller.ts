import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { UsersApiService } from './services/users.api.service';
import { CreateUserDTO } from 'src/users/common/dto/createUser.dto';
import { PropelauthGuard } from 'src/auth/common/guard/propelauth.guard';
import { Public } from 'src/auth/common/decorator/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersApiService) {}

  @Post()
  @UseGuards(PropelauthGuard)
  createUser(@Body() body: CreateUserDTO) {
    return this.usersService.createUser(body);
  }

  @Public()
  @Post('/propelauth-webhook/update')
  async propelauthWebhookTest(@Body() body: unknown, @Query() query: unknown) {
    console.log(body);
    console.log(query);

    return {
      message: 'ok',
    };
  }
}
