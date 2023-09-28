import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from 'src/users/users.module';
import { FinanceController } from './finance.controller';
import { PropelauthGuard } from 'src/auth/common/guard/propelauth.guard';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';
import { ReimbursementApiService } from './services/reimbursement.api.service';
import { ReimbursementCronService } from './services/cron/reimbursement.cron.service';
import { ReimbursementRequestTypesService } from './services/reimbursement.request-types.service';
import { ReimbursementExpenseTypesService } from './services/reimbursement.expense-types.service';
import { ReimbursementRequestStatusService } from './services/reimbursement.request-status.service';
import { ReimbursementGetAllService } from './services/reimbursement.get-all.service';
import { ReimbursementGetOneService } from './services/reimbursement.get-one.service';
import { ReimbursementCreateService } from './services/reimbursement.create.service';
import { ReimbursementForApprovalService } from './services/reimbursement.for-approval.service';
import { ReimbursementAnalyticsService } from './services/reimbursement.analytics.service';
import { ReimbursementApproveService } from './services/reimbursement.approve.service';
import { ReimbursementOhHoldService } from './services/reimbursement.onhold.service';
import { ReimbursementCancelService } from './services/reimbursement.cancel.service';
import { ReimbursementRejectService } from './services/reimbursement.reject.service';
import { ReimbursementAuditlogService } from './services/reimbursement.auditlog.service';
import { ReimbursementStreamFileService } from './services/reimbursement.stream-file.service';
import { ReimbursementCreateAttachmentService } from './services/reimbursement.create-attachment.service';
import { ReimbursementMemphisNewRequestService } from './services/memphis/reimbursement.memphis.new-request.service';
import { ReimbursementMemphisBulkApprovalService } from './services/memphis/reimbursement.memphis-bulk-approval.service';
import { ReimbursementMemphisEmailNewUserService } from './services/memphis/reimbursement.memphis-email-new-user.service';
import { ReimbursementMemphisEmailConfirmationService } from './services/memphis/reimbursement.memphis-email-confirmation.service';
import { ReimbursementMemphisEmailHrbpApprovalService } from './services/memphis/reimbursement.memphis-email-hrbp-approval.service';
import { ReimbursementMemphisEmailManagerApprovalService } from './services/memphis/reimbursement.memphis-email-manager-approval.service';
import { ReimbursementMemphisEmailRejectRequestService } from './services/memphis/reimbursement.memphis-email-reject-request.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UsersModule,
    HttpModule,
    MemphisDevModule,
  ],
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
    ReimbursementRequestStatusService,
    ReimbursementGetAllService,
    ReimbursementGetOneService,
    ReimbursementCreateService,
    ReimbursementForApprovalService,
    ReimbursementAnalyticsService,
    ReimbursementApproveService,
    ReimbursementOhHoldService,
    ReimbursementCancelService,
    ReimbursementRejectService,
    ReimbursementAuditlogService,
    ReimbursementStreamFileService,
    ReimbursementCreateAttachmentService,
    ReimbursementMemphisNewRequestService,
    ReimbursementMemphisEmailNewUserService,
    ReimbursementMemphisBulkApprovalService,
    ReimbursementMemphisEmailConfirmationService,
    ReimbursementMemphisEmailManagerApprovalService,
    ReimbursementMemphisEmailHrbpApprovalService,
    ReimbursementMemphisEmailRejectRequestService,
  ],
})
export class FinanceModule {}
