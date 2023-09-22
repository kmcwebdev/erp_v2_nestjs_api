import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { FinanceReimbursementRequestReportType } from '../common/dto/finance-reimbursement-request-report.dto';
import { PROCESSING_REQUEST } from '../common/constant';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';

@Injectable()
export class ReimbursementStreamFileService {
  private readonly logger = new Logger(ReimbursementStreamFileService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  // Date approve by HRBP
  // Reimbursement Type
  // Reference No.
  // Client Name
  // Employee Name
  // Employee ID
  // Amount
  // Remarks Description
  async financeReport(
    user: RequestUser,
    data: FinanceReimbursementRequestReportType,
  ) {
    const transactionForProcessing = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const reimbursementRequests = await trx
          .selectFrom('finance_reimbursement_requests')
          .innerJoin(
            'finance_reimbursement_request_types',
            'finance_reimbursement_request_types.reimbursement_request_type_id',
            'finance_reimbursement_requests.reimbursement_request_type_id',
          )
          .innerJoin(
            'users',
            'users.user_id',
            'finance_reimbursement_requests.requestor_id',
          )
          .select([
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_requests.created_at',
            'finance_reimbursement_request_types.request_type',
            'finance_reimbursement_requests.reference_no',
            'users.client_name',
            'users.full_name as employee_name',
            'users.employee_id',
            'finance_reimbursement_requests.amount',
            'finance_reimbursement_requests.remarks',
          ])
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            'in',
            data.reimbursement_request_ids,
          )
          .execute();

        await trx
          .updateTable('finance_reimbursement_requests')
          .set({
            finance_request_status_id: PROCESSING_REQUEST,
          })
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            'in',
            reimbursementRequests.map((rr) => rr.reimbursement_request_id),
          )
          .execute();

        await trx
          .insertInto('finance_reimbursement_approval_audit_logs')
          .values(
            reimbursementRequests.map((rr) => ({
              user_id: user.original_user_id,
              reimbursement_request_id: rr.reimbursement_request_id,
              description: 'Set request status processing',
            })),
          )
          .execute();

        return reimbursementRequests;
      });

    return transactionForProcessing;
  }
}
