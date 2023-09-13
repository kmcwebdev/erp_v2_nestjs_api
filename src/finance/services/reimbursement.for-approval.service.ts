import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { DB } from 'src/common/types';
import { CANCELLED_REQUEST, REJECTED_REQUEST } from '../common/constant';

@Injectable()
export class ReimbursementForApprovalService {
  private readonly logger = new Logger(ReimbursementForApprovalService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(user: RequestUser) {
    const approverIds = [];

    // TODO: Delete this after debuging
    console.log(user);

    const approvers = await this.pgsql.transaction().execute(async (trx) => {
      const department = await trx
        .selectFrom('departments')
        .select(['group_id'])
        .where('user_id', '=', user.original_user_id)
        .executeTakeFirst();

      const group = await trx
        .selectFrom('groups')
        .select(['group_id'])
        .where('group_id', '=', department.group_id)
        .executeTakeFirst();

      const approver = await trx
        .selectFrom('finance_reimbursement_approvers')
        .select(['approver_id'])
        .where(
          'finance_reimbursement_approvers.signatory_id',
          'in',
          [user.original_user_id, group?.group_id ? group.group_id : ''].filter(
            (str) => str !== '',
          ),
        )
        .execute();

      return approver;
    });

    if (approvers.length) {
      approvers.forEach((ap) => approverIds.push(ap.approver_id));
    }

    if (approverIds.length === 0) {
      return [];
    }

    const reimbursementRequests = await this.pgsql
      .selectFrom('finance_reimbursement_approval_matrix')
      .innerJoin(
        'finance_reimbursement_requests',
        'finance_reimbursement_requests.reimbursement_request_id',
        'finance_reimbursement_approval_matrix.reimbursement_request_id',
      )
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
        'finance_reimbursement_request_status',
        'finance_reimbursement_request_status.request_status_id',
        'finance_reimbursement_requests.request_status_id',
      )
      .innerJoin(
        'users',
        'users.user_id',
        'finance_reimbursement_requests.requestor_id',
      )
      .select([
        'finance_reimbursement_requests.reimbursement_request_id',
        'finance_reimbursement_approval_matrix.approval_matrix_id',
        'finance_reimbursement_requests.reference_no',
        'finance_reimbursement_request_types.request_type',
        'finance_reimbursement_expense_types.expense_type',
        'finance_reimbursement_request_status.request_status',
        'finance_reimbursement_requests.amount',
        'finance_reimbursement_requests.attachment',
        'finance_reimbursement_requests.attachment_mask_name',
        'finance_reimbursement_requests.remarks',
        'users.full_name',
        'users.email',
        'users.employee_id',
        'users.client_name',
        'users.hrbp_approver_email',
        'users.payroll_account',
        'finance_reimbursement_requests.created_at',
      ])
      .where(
        'finance_reimbursement_approval_matrix.approver_id',
        'in',
        approverIds,
      )
      .where('finance_reimbursement_requests.request_status_id', 'not in', [
        REJECTED_REQUEST,
        CANCELLED_REQUEST,
      ])
      .orderBy('finance_reimbursement_requests.created_at', 'desc')
      .limit(10)
      .execute();

    return reimbursementRequests;
  }
}
