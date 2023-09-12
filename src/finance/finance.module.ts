import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { FinanceController } from './finance.controller';
import { PropelauthGuard } from 'src/auth/common/guard/propelauth.guard';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';
import { ReimbursementApiService } from './services/reimbursement.api.service';
import { ReimbursementCronService } from './services/cron/reimbursement.cron.service';
import { ReimbursementRequestTypesService } from './services/reimbursement.request-types.service';
import { ReimbursementExpenseTypesService } from './services/reimbursement.expense-types.service';
import { ReimbursementGetAllService } from './services/reimbursement.get-all.service';
import { ReimbursementGetOneService } from './services/reimbursement.get-one.service';
import { ReimbursementCreateService } from './services/reimbursement.create.service';
import { ReimbursementForApprovalService } from './services/reimbursement.for-approval.service';
import { ReimbursementAnalyticsService } from './services/reimbursement.analytics.service';
import { ReimbursementApproveService } from './services/reimbursement.approve.service';
import { ReimbursementOhHoldService } from './services/reimbursement.onhold.service';
import { ReimbursementCancelService } from './services/reimbursement.cancel.service';
import { ReimbursementRejectService } from './services/reimbursement.reject.service';
import { ReimbursementCreateAttachmentService } from './services/reimbursement.create-attachment.service';
import { ReimbursementMemphisSendEmailService } from './services/memphis/reimbursement.memphis-send-email.service';
import { ReimbursementMemphisNewRequestService } from './services/memphis/reimbursement.memphis.new-request.service';
import { ReimbursementMemphisBulkApprovalService } from './services/memphis/reimbursement.memphis-bulk-approval.service';

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
    ReimbursementRequestTypesService,
    ReimbursementExpenseTypesService,
    ReimbursementGetAllService,
    ReimbursementGetOneService,
    ReimbursementCreateService,
    ReimbursementForApprovalService,
    ReimbursementAnalyticsService,
    ReimbursementApproveService,
    ReimbursementOhHoldService,
    ReimbursementCancelService,
    ReimbursementRejectService,
    ReimbursementCreateAttachmentService,
    ReimbursementMemphisSendEmailService,
    ReimbursementMemphisNewRequestService,
    ReimbursementMemphisBulkApprovalService,
  ],
  exports: [],
})
export class FinanceModule {}
