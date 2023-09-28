import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { DB } from 'src/common/types';
import {
  APPROVED_REQUEST,
  CANCELLED_REQUEST,
  PROCESSING_REQUEST,
  REJECTED_REQUEST,
} from '../common/constant';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { GetAllApprovalReimbursementRequestType } from '../common/dto/get-all-for-approval-reimbursement-request.dto';

@Injectable()
export class ReimbursementForApprovalService {
  private readonly logger = new Logger(ReimbursementForApprovalService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(user: RequestUser, filter: GetAllApprovalReimbursementRequestType) {
    const finance = user.user_assigned_role === 'finance';

    const EXCLUDED_IN_LIST = [CANCELLED_REQUEST, REJECTED_REQUEST];

    if (finance) {
      let query = this.pgsql
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
          'finance_reimbursement_request_status as main_request_status',
          'main_request_status.request_status_id',
          'finance_reimbursement_requests.request_status_id',
        )
        .innerJoin(
          'finance_reimbursement_request_status as hrbp_status',
          'hrbp_status.request_status_id',
          'finance_reimbursement_requests.hrbp_request_status_id',
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
          'finance_reimbursement_requests.reimbursement_request_id',
          'finance_reimbursement_requests.reference_no',
          'finance_reimbursement_request_types.request_type',
          'finance_reimbursement_expense_types.expense_type',
          'main_request_status.request_status as requestor_request_status',
          'hrbp_status.request_status as hrbp_request_status',
          'finance_status.request_status as finance_request_status',
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
        ]);

      if (EXCLUDED_IN_LIST.length) {
        query = query.where(
          'finance_reimbursement_requests.request_status_id',
          'not in',
          EXCLUDED_IN_LIST,
        );
      }

      query = query.where(
        'finance_reimbursement_requests.hrbp_request_status_id',
        '=',
        APPROVED_REQUEST,
      );

      query = query.where(
        'finance_reimbursement_requests.finance_request_status_id',
        '!=',
        PROCESSING_REQUEST,
      );

      if (filter?.reimbursement_type_id) {
        query = query.where(
          'finance_reimbursement_requests.reimbursement_request_type_id',
          '=',
          filter.reimbursement_type_id,
        );
      }

      if (filter?.expense_type_ids) {
        const expenseTypeIds = filter.expense_type_ids
          .replace(/"/g, '')
          .split(',');

        // TODO: Do the check here if all items in array is a valid uuid

        query = query.where(
          'finance_reimbursement_requests.expense_type_id',
          'in',
          expenseTypeIds,
        );
      }

      if (filter?.text_search) {
        query = query.where(
          sql`to_tsvector('english', finance_reimbursement_requests.reference_no || ' ' || coalesce(users.full_name, '') || ' ' || users.email || ' ' ||  
         coalesce(users.client_name, '') || ' ' || coalesce(users.hrbp_approver_email, '')) @@ websearch_to_tsquery(${filter.text_search})`,
        );
      }

      if (filter?.from && filter?.to) {
        const { from, to } = filter;

        query = query.where(
          sql`DATE(finance_reimbursement_requests.created_at) BETWEEN ${from} AND ${to}`,
        );
      }

      return await query
        .orderBy('finance_reimbursement_requests.created_at', 'desc')
        .limit(10)
        .execute();
    }

    const approvers = await this.pgsql.transaction().execute(async (trx) => {
      const approver = await trx
        .selectFrom('finance_reimbursement_approvers')
        .select(['approver_id'])
        .where(
          'finance_reimbursement_approvers.signatory_id',
          '=',
          user.original_user_id,
        )
        .executeTakeFirst();

      const matrix = await trx
        .selectFrom('finance_reimbursement_approval_matrix')
        .select(['approval_matrix_id', 'approver_order'])
        .where('approver_id', '=', approver.approver_id)
        .where('has_approved', '=', false)
        .where('has_rejected', '=', false)
        .execute();

      return matrix;
    });

    if (approvers.length === 0) {
      return [];
    }

    let query = this.pgsql
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
        'finance_reimbursement_request_status as main_request_status',
        'main_request_status.request_status_id',
        'finance_reimbursement_requests.request_status_id',
      )
      .innerJoin(
        'finance_reimbursement_request_status as hrbp_status',
        'hrbp_status.request_status_id',
        'finance_reimbursement_requests.hrbp_request_status_id',
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
        'finance_reimbursement_requests.reimbursement_request_id',
        'finance_reimbursement_approval_matrix.approval_matrix_id',
        'finance_reimbursement_requests.reference_no',
        'finance_reimbursement_request_types.request_type',
        'finance_reimbursement_expense_types.expense_type',
        'main_request_status.request_status as requestor_request_status',
        'hrbp_status.request_status as hrbp_request_status',
        'finance_status.request_status as finance_request_status',
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
      ]);

    query = query.where(
      'finance_reimbursement_approval_matrix.approval_matrix_id',
      'in',
      approvers.map((ap) => ap.approval_matrix_id),
    );

    if (EXCLUDED_IN_LIST.length) {
      query = query.where(
        'finance_reimbursement_requests.request_status_id',
        'not in',
        EXCLUDED_IN_LIST,
      );
    }

    if (filter?.expense_type_ids) {
      const expenseTypeIds = filter.expense_type_ids
        .replace(/"/g, '')
        .split(',');

      // TODO: Do the check here if all items in array is a valid uuid

      query = query.where(
        'finance_reimbursement_requests.expense_type_id',
        'in',
        expenseTypeIds,
      );
    }

    if (filter?.reimbursement_type_id) {
      query = query.where(
        'finance_reimbursement_requests.reimbursement_request_type_id',
        '=',
        filter.reimbursement_type_id,
      );
    }

    if (filter?.text_search) {
      query = query.where(
        sql`to_tsvector('english', finance_reimbursement_requests.reference_no || ' ' || coalesce(users.full_name, '') || ' ' || users.email || ' ' ||  
         coalesce(users.client_name, '') || ' ' || coalesce(users.hrbp_approver_email, '')) @@ websearch_to_tsquery(${filter.text_search})`,
      );
    }

    if (filter?.from && filter?.to) {
      const { from, to } = filter;

      query = query.where(
        sql`DATE(finance_reimbursement_requests.created_at) BETWEEN ${from} AND ${to}`,
      );
    }

    return await query
      .orderBy('finance_reimbursement_requests.created_at', 'desc')
      .limit(10)
      .execute();
  }
}
