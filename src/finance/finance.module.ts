import { Module } from '@nestjs/common';
import { ReimbursementApiService } from './services/reimbursement.api.service';
import { FinanceController } from './finance.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { ReimbursementMemphisUserService } from './services/reimbursement.memphis.user.service';
import { ReimbursementCronService } from './services/reimbursement.cron.service';
import { PostgresModule } from 'src/common/database/postgres.module';
import { MemphisModule } from 'memphis-dev';
import { ReimbursementMemphisEmailService } from './services/reimbursement.memphis.email.service';
import { ReimbursementMemphisRequestService } from './services/reimbursement.memphis.request.service';

@Module({
  imports: [PostgresModule, MemphisModule.register(), ScheduleModule.forRoot()],
  controllers: [FinanceController],
  providers: [
    ReimbursementApiService,
    ReimbursementCronService,
    ReimbursementMemphisUserService,
    ReimbursementMemphisEmailService,
    ReimbursementMemphisRequestService,
  ],
})
export class FinanceModule {}
