import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { GetOneReimbursementRequestType } from '../common/dto/getOneReimbursementRequest.dto';
import { ReimbursementRequest } from '../common/interface/getOneRequest.interface';

@Injectable()
export class ReimbursementGetOneService {
  private readonly logger = new Logger(ReimbursementGetOneService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(params: GetOneReimbursementRequestType) {
    const singleRequest = await sql<ReimbursementRequest>`
          WITH ApproverAggregation AS (
          SELECT
              frr.reimbursement_request_id,
              json_agg(
                  json_build_object(
                      'approval_matrix_id', fram.approval_matrix_id,
                      'approver_id', fram.approver_id,
                      'approver_order', fram.approver_order,
                      'has_approved', fram.has_approved,
                      'has_rejected', fram.has_rejected,
                      'performed_by_user_id', fram.performed_by_user_id,
                      'description', fram.description,
                      'approver_name',
                          CASE
                              WHEN fra.table_reference = 'users' THEN u.full_name
                              WHEN fra.table_reference = 'groups' THEN g.group_name
                          END,
                      'is_group_of_approvers', fra.is_group_of_approvers,
                      'table_reference', fra.table_reference,
                      'updated_at', fram.updated_at
                  )
                  ORDER BY fram.approver_order ASC
              ) AS approvers
          FROM
              finance_reimbursement_requests frr
              JOIN finance_reimbursement_approval_matrix fram ON frr.reimbursement_request_id = fram.reimbursement_request_id
              JOIN finance_reimbursement_approvers fra ON fram.approver_id = fra.approver_id
              LEFT JOIN users u ON fra.signatory_id = u.user_id AND fra.table_reference = 'users'
              LEFT JOIN groups g ON fra.signatory_id = g.group_id AND fra.table_reference = 'groups'
          WHERE
              frr.reimbursement_request_id = ${params.reimbursement_request_id}
          GROUP BY
              frr.reimbursement_request_id
      ), NextApprover AS (
          SELECT
              reimbursement_request_id,
              MIN(approver_order) AS next_approver_order
          FROM
              finance_reimbursement_approval_matrix
          WHERE
              has_approved = false
          GROUP BY
              reimbursement_request_id
      )

      SELECT
        frr.reimbursement_request_id,
        frrt.request_type,
        fret.expense_type,
        frr.reference_no,
        frr.attachment,
        frr.attachment_mask_name,
        frr.amount,
        frrs.request_status,
        frr.remarks,
        frr.requestor_id,
        u.full_name,
        u.email,
        u.employee_id,
        u.client_id,
        u.client_name,
        u.hrbp_approver_email,
        frr.dynamic_approvers,
        frr.date_approve,
        fram.approval_matrix_id AS next_approval_matrix_id,
        na.next_approver_order,
        frr.is_cancelled,
        frr.is_onhold,
        frr.created_at,
        aa.approvers
    FROM
        finance_reimbursement_requests frr
        LEFT JOIN users u ON frr.requestor_id = u.user_id
        LEFT JOIN finance_reimbursement_request_types frrt ON frr.reimbursement_request_type_id = frrt.reimbursement_request_type_id
        LEFT JOIN finance_reimbursement_expense_types fret ON frr.expense_type_id = fret.expense_type_id
        LEFT JOIN finance_reimbursement_request_status frrs ON frrs.request_status_id = frr.request_status_id
        LEFT JOIN ApproverAggregation aa ON frr.reimbursement_request_id = aa.reimbursement_request_id
        LEFT JOIN NextApprover na ON frr.reimbursement_request_id = na.reimbursement_request_id
        LEFT JOIN finance_reimbursement_approval_matrix fram ON frr.reimbursement_request_id = fram.reimbursement_request_id
            AND na.next_approver_order = fram.approver_order
    WHERE
        frr.reimbursement_request_id = ${params.reimbursement_request_id};
    `.execute(this.pgsql);

    if (!singleRequest.rows.length) {
      throw new HttpException('Request not found', HttpStatus.NOT_FOUND);
    }

    return singleRequest.rows[0];
  }
}
