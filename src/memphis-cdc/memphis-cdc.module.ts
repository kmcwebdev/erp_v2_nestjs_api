import { Module } from '@nestjs/common';
import { MemphisCdcService } from './memphis-cdc.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  providers: [MemphisCdcService],
})
export class MemphisCdcModule {}
