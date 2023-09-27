import { Module } from '@nestjs/common';
import { FilestackService } from './filestack.service';
import { FilestackController } from './filestack.controller';

@Module({
  controllers: [FilestackController],
  providers: [FilestackService],
})
export class FilestackModule {}
