import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { GetAllReimbursementRequestType } from '../common/dto/getAllReimbursementRequest.dto';

@Injectable()
export class ReimbursementGetAllService {
  private readonly logger = new Logger(ReimbursementGetAllService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(user: RequestUser, data: GetAllReimbursementRequestType) {
    const { original_user_id } = user;
    const default_page_limit = 20;

    const rawQuery = sql`SELECT 
              frr.reimbursement_request_id,
              frr.reference_no,
              frrt.request_type,
              fret.expense_type,
              frrs.request_status,
              frr.amount,
              frr.attachment,
              frr.attachment_mask_name,
              frr.remarks,
              u.full_name,
              u.email,
              u.employee_id,
              u.hrbp_approver_email,
              frr.payroll_date,
              frr.date_approve,
              frr.created_at,
              frr.cursor_id::TEXT
              ${
                data?.text_search
                  ? sql`
              ,ts_rank(to_tsvector('english', coalesce(frr.text_search_properties, '')), websearch_to_tsquery(${data.text_search})) AS rank`
                  : sql``
              }  
            FROM finance_reimbursement_requests as frr
            INNER JOIN finance_reimbursement_request_types AS frrt
              ON frrt.reimbursement_request_type_id = frr.reimbursement_request_type_id
            INNER JOIN finance_reimbursement_expense_types AS fret
              ON frr.expense_type_id = fret.expense_type_id
            INNER JOIN finance_reimbursement_request_status AS frrs
              ON frrs.request_status_id = frr.request_status_id
            INNER JOIN users AS u
              ON u.user_id = frr.requestor_id
            WHERE frr.requestor_id = ${original_user_id}
              ${
                data?.reimbursement_type_id
                  ? sql`
              AND frr.reimbursement_request_type_id = ${data.reimbursement_type_id}`
                  : sql``
              }
              ${
                data?.expense_type_id
                  ? sql`
              AND frr.expense_type_id = ${data.expense_type_id}`
                  : sql``
              }
              ${
                data?.request_status_id
                  ? sql`
              AND frr.request_status_id = ${data.request_status_id[0]}`
                  : sql``
              }
              ${
                data?.amount_min && data?.amount_max
                  ? sql`
              AND frr.amount BETWEEN ${data.amount_min} AND ${data.amount_max}`
                  : sql``
              }
              ${
                data?.reference_no
                  ? sql`
              AND frr.reference_no = ${data.reference_no}`
                  : sql``
              }
              ${
                data?.last_id
                  ? sql`
              AND frr.cursor_id < ${data.last_id}`
                  : sql``
              }
              ${
                data?.text_search
                  ? sql`
              AND to_tsvector('english', coalesce(frr.text_search_properties, '')) @@ websearch_to_tsquery(${data.text_search})`
                  : sql``
              }
            ${
              data?.text_search
                ? sql`ORDER BY rank DESC`
                : sql`${
                    data?.last_id
                      ? sql`ORDER BY frr.cursor_id DESC`
                      : sql`ORDER BY frr.created_at DESC`
                  }`
            } LIMIT ${data?.page_limit || default_page_limit}
            `;

    const requests = await rawQuery.execute(this.pgsql);

    return requests.rows;
  }
}
