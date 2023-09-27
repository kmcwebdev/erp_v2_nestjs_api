import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { GetAllReimbursementRequestType } from '../common/dto/get-all-reimbursement-request.dto';

@Injectable()
export class ReimbursementGetAllService {
  private readonly logger = new Logger(ReimbursementGetAllService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(user: RequestUser, filter: GetAllReimbursementRequestType) {
    const { original_user_id } = user;
    const default_page_limit = 20;

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
      ]);

    query = query.where(
      'finance_reimbursement_requests.requestor_id',
      '=',
      original_user_id,
    );

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

    // TODO: I think this is not necessary...
    if (filter?.text_search) {
      query = query.where(
        sql`to_tsvector('english', finance_reimbursement_requests.reference_no || ' ' || coalesce(users.full_name, '') || ' ' || users.email || ' ' ||  
         coalesce(users.client_name, '') || ' ' || coalesce(users.hrbp_approver_email, '')) @@ websearch_to_tsquery(${filter.text_search})`,
      );
    }

    return await query
      .orderBy('finance_reimbursement_requests.created_at', 'desc')
      .limit(default_page_limit || filter?.page_limit)
      .execute();
  }
}
