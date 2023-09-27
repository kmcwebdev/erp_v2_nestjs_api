import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { PROCESSING_REQUEST } from '../common/constant';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { FinanceReimbursementRequestReportType } from '../common/dto/finance-reimbursement-request-report.dto';

@Injectable()
export class ReimbursementStreamFileService {
  private readonly logger = new Logger(ReimbursementStreamFileService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async hrbpReport(
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
            'finance_reimbursement_expense_types',
            'finance_reimbursement_expense_types.expense_type_id',
            'finance_reimbursement_requests.expense_type_id',
          )
          .innerJoin(
            'finance_reimbursement_request_status as finance_status',
            'finance_status.request_status_id',
            'finance_reimbursement_requests.finance_request_status_id',
          )
          .innerJoin(
            'users',
            'users.user_id',
            'finance_reimbursement_requests.requestor_id',
          )
          .select([
            'users.client_name',
            'users.employee_id',
            'users.full_name as employee_name',
            'finance_reimbursement_requests.reference_no',
            'finance_reimbursement_request_types.request_type',
            'finance_reimbursement_expense_types.expense_type',
            'finance_reimbursement_requests.amount',
            'finance_status.request_status as status',
            'finance_reimbursement_requests.created_at as date_filed',
            'finance_reimbursement_requests.date_approve',
          ])
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            'in',
            data.reimbursement_request_ids,
          )
          .execute();

        return reimbursementRequests;
      });

    return transactionForProcessing;
  }

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
            'finance_reimbursement_requests.date_approve',
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

    return transactionForProcessing.map((tfp) => ({
      date_approve: tfp.date_approve,
      reimbursement_type: tfp.request_type,
      reference_no: tfp.reference_no,
      client_name: tfp.client_name,
      employee_id: tfp.employee_id,
      amount: tfp.amount,
      remarks: tfp.remarks,
    }));
  }
}
