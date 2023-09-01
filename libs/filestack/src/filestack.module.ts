import { Module } from '@nestjs/common';
import { FilestackService } from './filestack.service';

@Module({
  providers: [FilestackService],
  exports: [FilestackService],
})
export class FilestackModule {}
