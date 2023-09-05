import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { UsersApiService } from './services/users.api.service';
import { CreateUserDTO } from 'src/users/common/dto/createUser.dto';
import { PropelauthGuard } from 'src/auth/common/guard/propelauth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersApiService) {}

  @Post()
  @UseGuards(PropelauthGuard)
  createUser(@Body() body: CreateUserDTO) {
    return this.usersService.createUser(body);
  }

  @Post('/propelauth-webhook/update')
  async propelauthWebhookTest(@Body() body: unknown, @Query() query: unknown) {
    console.log(body);
    console.log(query);

    return true;
  }
}
