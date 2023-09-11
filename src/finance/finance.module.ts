import { Module } from '@nestjs/common';
import { ReimbursementApiService } from './services/reimbursement.api.service';
import { FinanceController } from './finance.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { ReimbursementCronService } from './services/reimbursement.cron.service';
import { ReimbursementMemphisSendEmailService } from './services/reimbursement.memphis-send-email.service';
import { ReimbursementMemphisNewRequestService } from './services/reimbursement.memphis.new-request.service';
import { APP_GUARD } from '@nestjs/core';
import { PropelauthGuard } from 'src/auth/common/guard/propelauth.guard';
import { HttpModule } from '@nestjs/axios';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';
import { ReimbursementMemphisBulkApprovalService } from './services/reimbursement.memphis-bulk-approval.service';

@Module({
  imports: [ScheduleModule.forRoot(), HttpModule, MemphisDevModule],
  controllers: [FinanceController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PropelauthGuard,
    },
    ReimbursementApiService,
    ReimbursementCronService,
    ReimbursementMemphisSendEmailService,
    ReimbursementMemphisNewRequestService,
    ReimbursementMemphisBulkApprovalService,
  ],
  exports: [
    ReimbursementMemphisSendEmailService,
    ReimbursementMemphisNewRequestService,
    ReimbursementMemphisBulkApprovalService,
  ],
})
export class FinanceModule {}
