import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { DB } from 'src/common/types';

@Injectable()
export class ReimbursementForApprovalService {
  private readonly logger = new Logger(ReimbursementForApprovalService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(user: RequestUser) {
    const approverIds = [];

    const approvers = await this.pgsql.transaction().execute(async (trx) => {
      const department = await trx
        .selectFrom('departments')
        .select(['departments.group_id'])
        .where('user_id', '=', user.original_user_id)
        .executeTakeFirst();

      const group = await trx
        .selectFrom('groups')
        .select(['groups.group_id'])
        .where('groups.group_id', '=', department?.group_id || null)
        .executeTakeFirst();

      const approver = await trx
        .selectFrom('finance_reimbursement_approvers')
        .select('approver_id')
        .where((eb) =>
          eb.or([
            eb(
              'finance_reimbursement_approvers.signatory_id',
              '=',
              user.original_user_id,
            ),
            eb(
              'finance_reimbursement_approvers.signatory_id',
              '=',
              group.group_id,
            ),
          ]),
        )
        .executeTakeFirst();

      this.logger.log(JSON.stringify({ single: approver, group }));

      return { approver, group };
    });

    if (approvers?.approver) {
      approverIds.push(approvers.approver.approver_id);
    }

    if (approvers?.group) {
      approverIds.push(approvers.group.group_id);
    }

    if (approverIds.length === 0) {
      return [];
    }

    const rawQuery = await sql`SELECT 
          frr.reimbursement_request_id,
          fram.approval_matrix_id,
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
          u.client_id,
          u.client_name,
          u.hrbp_approver_email,
          frr.created_at
        FROM finance_reimbursement_approval_matrix AS fram
        INNER JOIN finance_reimbursement_requests AS frr
          ON frr.reimbursement_request_id = fram.reimbursement_request_id
        INNER JOIN finance_reimbursement_request_types AS frrt
          ON frrt.reimbursement_request_type_id = frr.reimbursement_request_type_id
        INNER JOIN finance_reimbursement_expense_types AS fret
          ON frr.expense_type_id = fret.expense_type_id
        INNER JOIN finance_reimbursement_request_status AS frrs
          ON frrs.request_status_id = frr.request_status_id
        INNER JOIN users AS u
          ON u.user_id = frr.requestor_id
        WHERE fram.approver_id IN (${approverIds.join(',')})
        AND fram.has_approved = false
        AND frr.is_cancelled = false
        ORDER BY created_at DESC LIMIT 10`.execute(this.pgsql);

    return rawQuery.rows;
  }
}
