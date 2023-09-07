import { Module } from '@nestjs/common';
import { MemphisCdcService } from './memphis-cdc.service';
import { UsersModule } from 'src/users/users.module';
import { FinanceModule } from 'src/finance/finance.module';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';

@Module({
  imports: [UsersModule, FinanceModule, MemphisDevModule],
  providers: [MemphisCdcService],
})
export class MemphisCdcModule {}
