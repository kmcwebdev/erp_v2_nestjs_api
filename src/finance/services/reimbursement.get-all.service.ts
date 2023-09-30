import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { GetAllReimbursementRequestType } from '../common/dto/get-all-reimbursement-request.dto';
import {
  APPROVED_REQUEST,
  ONHOLD_REQUEST,
  PROCESSING_REQUEST,
  REJECTED_REQUEST,
} from '../common/constant';

@Injectable()
export class ReimbursementGetAllService {
  private readonly logger = new Logger(ReimbursementGetAllService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(user: RequestUser, filter: GetAllReimbursementRequestType) {
    const { original_user_id } = user;
    const default_page_limit = 20;

    const reimbursementRequestIds = [];

    if (
      ['hrbp', 'external reimbursement approver manager', 'finance'].includes(
        user.user_assigned_role,
      ) &&
      filter?.history
    ) {
      const initialRequestStatuses = [APPROVED_REQUEST, REJECTED_REQUEST];

      if (user.user_assigned_role === 'finance') {
        initialRequestStatuses.push(ONHOLD_REQUEST);
        initialRequestStatuses.push(PROCESSING_REQUEST);
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

        let matrix = trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select('finance_reimbursement_requests.reimbursement_request_id')
          .where(
            'finance_reimbursement_requests.hrbp_request_status_id',
            'in',
            initialRequestStatuses,
          );

        if (
          ['hrbp', 'external reimbursement approver manager'].includes(
            user.user_assigned_role,
          )
        ) {
          matrix = matrix.where(
            'finance_reimbursement_approval_matrix.approver_id',
            '=',
            approver.approver_id,
          );
        }

        return await matrix.execute();
      });

      if (approvers.length) {
        approvers.forEach((ap) =>
          reimbursementRequestIds.push(ap.reimbursement_request_id),
        );
      }
    }

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
        'finance_reimbursement_requests.payroll_date',
        'finance_reimbursement_requests.date_approve',
        'finance_reimbursement_requests.date_processed',
        'finance_reimbursement_requests.created_at',
        filter?.text_search
          ? sql<number>`ts_rank(to_tsvector('english', finance_reimbursement_requests.reference_no || ' ' || coalesce(users.full_name, '') || ' ' || users.email || ' ' ||  
         coalesce(users.client_name, '') || ' ' || coalesce(users.hrbp_approver_email, ''), plainto_tsquery(${
           filter?.text_search || ''
         }))`.as('rank')
          : null,
      ]);

    if (reimbursementRequestIds.length) {
      query = query.where(
        'finance_reimbursement_requests.reimbursement_request_id',
        'in',
        reimbursementRequestIds,
      );
    }

    if (!filter?.history) {
      query = query.where(
        'finance_reimbursement_requests.requestor_id',
        '=',
        original_user_id,
      );
    }

    if (filter?.reference_no) {
      query = query.where(
        'finance_reimbursement_requests.reference_no',
        '=',
        filter.reference_no,
      );
    }

    if (filter?.reimbursement_type_id) {
      query = query.where(
        'finance_reimbursement_requests.reimbursement_request_type_id',
        '=',
        filter.reimbursement_type_id,
      );
    }

    if (filter?.expense_type_id) {
      query = query.where(
        'finance_reimbursement_requests.expense_type_id',
        '=',
        filter.expense_type_id,
      );
    }

    if (filter?.request_status_id) {
      query = query.where(
        'finance_reimbursement_requests.request_status_id',
        'in',
        filter.request_status_id,
      );
    }

    if (filter?.amount_min && filter?.amount_max) {
      query = query.where(
        sql`AND finance_reimbursement_requests.amount BETWEEN ${filter.amount_min} AND ${filter.amount_max}`,
      );
    }

    if (filter?.text_search) {
      query = query.where(
        sql`to_tsvector('english', finance_reimbursement_requests.reference_no || ' ' || coalesce(users.full_name, '') || ' ' || users.email || ' ' ||  
         coalesce(users.client_name, '') || ' ' || coalesce(users.hrbp_approver_email, '')) @@ plainto_tsquery(${filter.text_search})`,
      );
    }

    return await query
      .orderBy('finance_reimbursement_requests.created_at', 'desc')
      .limit(default_page_limit || filter?.page_limit)
      .execute();
  }
}
