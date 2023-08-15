import { Module } from '@nestjs/common';
import { ReimbursementService } from './services/reimbursement.service';
import { FinanceController } from './finance.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { ReimbursementMemphisService } from './services/reimbursement.memphis.service';
import { ReimbursementCronService } from './services/reimbursement.cron.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [FinanceController],
  providers: [
    ReimbursementService,
    ReimbursementCronService,
    ReimbursementMemphisService,
  ],
})
export class FinanceModule {}
