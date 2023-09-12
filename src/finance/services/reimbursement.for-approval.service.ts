import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { DB } from 'src/common/types';

@Injectable()
export class ReimbursementForApprovalService {
  private readonly logger = new Logger(ReimbursementForApprovalService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(user: RequestUser) {
    try {
      const approverIds = [];

      const approvers = await this.pgsql.transaction().execute(async (trx) => {
        const single = await trx
          .selectFrom('finance_reimbursement_approvers')
          .select('approver_id')
          .where('signatory_id', '=', user.original_user_id)
          .executeTakeFirst();

        const approverDepartment = await trx
          .selectFrom('departments')
          .select(['departments.group_id'])
          .where('user_id', '=', user.original_user_id)
          .executeTakeFirst();

        const group = await trx
          .selectFrom('groups')
          .select(['groups.group_id'])
          .where('groups.group_id', '=', approverDepartment?.group_id || null)
          .executeTakeFirst();

        return { single, group };
      });

      if (approvers?.single) {
        approverIds.push(approvers.single.approver_id);
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
          fram.approver_id,
          fram.approver_order,
          fram.has_approved,
          fram.has_rejected,
          fram.performed_by_user_id,
          fram.description,
          fram.updated_at,
          u.full_name,
          u.email,
          u.employee_id,
          u.client_id,
          u.client_name,
          u.hrbp_approver_email,
          frr.is_cancelled,
          frr.is_onhold,
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
    } catch (error) {
      this.logger.error(error?.message);
      throw new HttpException(
        'Internal query error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
