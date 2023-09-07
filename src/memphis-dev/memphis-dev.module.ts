import { Module } from '@nestjs/common';
import { MemphisDevProducerService } from './memphis-dev-producer.service';

@Module({
  providers: [MemphisDevProducerService],
  exports: [MemphisDevProducerService],
})
export class MemphisDevModule {}
