import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PropelauthGuard } from './common/guard/propelauth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(PropelauthGuard)
  test(@Req() req: Request) {
    return req['user'];
  }
}
