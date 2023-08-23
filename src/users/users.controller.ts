import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UsersApiService } from './services/users.api.service';
import { CreateUserDTO } from 'src/users/common/dto/createUser.dto';
import { AuthGuard } from 'src/auth/common/guard/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersApiService) {}

  @Post()
  @UseGuards(AuthGuard)
  createUser(@Body() body: CreateUserDTO) {
    return this.usersService.createUser(body);
  }
}
