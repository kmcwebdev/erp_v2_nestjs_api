import { Module } from '@nestjs/common';
import { PostgresjsService } from './postgresjs.service';

@Module({
  providers: [PostgresjsService],
  exports: [PostgresjsService],
})
export class PostgresjsModule {}
