import { Module } from '@nestjs/common';
import { MemphisCdcService } from './memphis-cdc.service';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';

@Module({
  imports: [MemphisDevModule],
  providers: [MemphisCdcService],
})
export class MemphisCdcModule {}
