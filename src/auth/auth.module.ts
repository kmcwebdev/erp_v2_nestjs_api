import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { PropelauthGuard } from './common/guard/propelauth.guard';

@Module({
  imports: [HttpModule],
  controllers: [AuthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PropelauthGuard,
    },
    AuthService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
