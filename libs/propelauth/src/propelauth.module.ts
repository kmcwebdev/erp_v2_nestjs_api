import { Module } from '@nestjs/common';
import { PropelauthService } from './propelauth.service';

@Module({
  providers: [PropelauthService],
  exports: [PropelauthService],
})
export class PropelauthModule {}
