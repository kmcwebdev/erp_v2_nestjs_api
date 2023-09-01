import { Module } from '@nestjs/common';
import { MemphisCdcService } from './memphis-cdc.service';
import { UsersModule } from 'src/users/users.module';
import { FinanceModule } from 'src/finance/finance.module';

@Module({
  imports: [UsersModule, FinanceModule],
  providers: [MemphisCdcService],
})
export class MemphisCdcModule {}
