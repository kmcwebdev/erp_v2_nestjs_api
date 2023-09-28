import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { DB } from 'src/common/types';
import { ReimbursementGetOneService } from './reimbursement.get-one.service';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { ReimbursementRequestApprovalType } from '../common/dto/approve-reimbursement-request.dto';
import { APPROVED_REQUEST, PENDING_REQUEST } from '../common/constant';
import { HrbpApprovalEmailType } from '../common/zod-schema/hrbp-approval-email.schema';

@Injectable()
export class ReimbursementApproveService {
  private readonly logger = new Logger(ReimbursementApproveService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly eventEmitter: EventEmitter2,
    private readonly reimbursementGetOneService: ReimbursementGetOneService,
  ) {}

  async approve(user: RequestUser, data: ReimbursementRequestApprovalType) {
    if (data.approval_matrix_ids.length > 1) {
      this.eventEmitter.emit('reimbursement-request-bulk-approval', {
        user,
        matrixIds: data.approval_matrix_ids,
      });

      return {
        message: 'Request approval queue started',
      };
    }

    return this.approveReimbursementRequest(user, data.approval_matrix_ids[0]);
  }

  async approveReimbursementRequest(
    user: RequestUser,
    approval_matrix_id: string,
  ) {
    const isManager =
      user.user_assigned_role === 'external reimbursement approver manager';
    const isHrbp = user.user_assigned_role === 'hrbp';

    const approveReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        let updateRequestMatrix = trx
          .updateTable('finance_reimbursement_approval_matrix')
          .set({
            has_approved: true,
            performed_by_user_id: user.original_user_id,
            updated_at: new Date(),
          })
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            '=',
            approval_matrix_id,
          )
          .where(
            'finance_reimbursement_approval_matrix.has_approved',
            '=',
            false,
          )
          .where(
            'finance_reimbursement_approval_matrix.has_rejected',
            '=',
            false,
          )
          .returning([
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.is_hrbp',
          ]);

        if (isManager) {
          updateRequestMatrix = updateRequestMatrix.where(
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            'in',
            this.pgsql
              .selectFrom('finance_reimbursement_requests as frr')
              .innerJoin(
                'finance_reimbursement_approval_matrix as fram',
                'fram.reimbursement_request_id',
                'frr.reimbursement_request_id',
              )
              .select('frr.reimbursement_request_id')
              .where('fram.approval_matrix_id', '=', approval_matrix_id)
              .where('frr.request_status_id', '=', PENDING_REQUEST),
          );
        }

        if (isHrbp) {
          updateRequestMatrix = updateRequestMatrix.where(
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            'in',
            this.pgsql
              .selectFrom('finance_reimbursement_requests as frr')
              .innerJoin(
                'finance_reimbursement_approval_matrix as fram',
                'fram.reimbursement_request_id',
                'frr.reimbursement_request_id',
              )
              .select('frr.reimbursement_request_id')
              .where('fram.approval_matrix_id', '=', approval_matrix_id)
              .where('frr.hrbp_request_status_id', '=', PENDING_REQUEST),
          );
        }

        const reimbursementRequestApprovalApprover =
          await updateRequestMatrix.executeTakeFirst();

        if (!reimbursementRequestApprovalApprover) {
          return {
            message: 'This request is already approved or cancelled',
          };
        }

        const nextReimbursementRequestApprovalApprover = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .select([
            'finance_reimbursement_approval_matrix.approver_id',
            'finance_reimbursement_approval_matrix.is_hrbp',
          ])
          .where(
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            '=',
            reimbursementRequestApprovalApprover.reimbursement_request_id,
          )
          .where(
            'finance_reimbursement_approval_matrix.has_approved',
            '=',
            false,
          )
          .orderBy('finance_reimbursement_approval_matrix.approver_order')
          .limit(1)
          .executeTakeFirst();

        if (!reimbursementRequestApprovalApprover.is_hrbp) {
          await this.pgsql
            .updateTable('finance_reimbursement_requests')
            .set({
              request_status_id: APPROVED_REQUEST,
            })
            .where(
              'finance_reimbursement_requests.reimbursement_request_id',
              '=',
              reimbursementRequestApprovalApprover.reimbursement_request_id,
            )
            .execute();
        }

        if (reimbursementRequestApprovalApprover.is_hrbp) {
          await sql`
              UPDATE finance_reimbursement_requests 
              SET payroll_date = 
                  CASE 
                    WHEN EXTRACT(DAY FROM CURRENT_DATE) BETWEEN 1 AND 15 THEN
                      CASE 
                        WHEN EXTRACT(DOW FROM DATE_TRUNC('MONTH', CURRENT_DATE) + INTERVAL '24 days') IN (0, 6) THEN
                            DATE_TRUNC('MONTH', CURRENT_DATE) + INTERVAL '23 days'
                        ELSE
                            DATE_TRUNC('MONTH', CURRENT_DATE) + INTERVAL '24 days'
                      END
                    ELSE 
                      CASE 
                        WHEN EXTRACT(DOW FROM DATE_TRUNC('MONTH', CURRENT_DATE) + INTERVAL '9 days' + INTERVAL '1 month') IN (0, 6) THEN
                            DATE_TRUNC('MONTH', CURRENT_DATE) + INTERVAL '8 days' + INTERVAL '1 month'
                        ELSE
                            DATE_TRUNC('MONTH', CURRENT_DATE) + INTERVAL '9 days' + INTERVAL '1 month'
                      END
                  END,
                  request_status_id = 
                      CASE 
                          WHEN request_status_id != ${APPROVED_REQUEST} THEN ${APPROVED_REQUEST}
                          ELSE request_status_id
                      END,
                  hrbp_request_status_id = ${APPROVED_REQUEST},
                  date_approve = CURRENT_TIMESTAMP
              WHERE reimbursement_request_id = ${reimbursementRequestApprovalApprover.reimbursement_request_id}
            `.execute(this.pgsql);
        }

        const reimbursement = await this.reimbursementGetOneService.get({
          reimbursement_request_id:
            reimbursementRequestApprovalApprover.reimbursement_request_id,
        });

        // TODO: Check this please (Valid for unscheduled use only)
        if (nextReimbursementRequestApprovalApprover) {
          if (nextReimbursementRequestApprovalApprover.is_hrbp) {
            const hrbp = await this.pgsql
              .selectFrom('users')
              .select(['users.email', 'users.full_name'])
              .where('users.email', '=', reimbursement.hrbp_approver_email)
              .executeTakeFirst();

            const hrbpApprovalEmailData: HrbpApprovalEmailType = {
              to: [hrbp.email],
              referenceNo: reimbursement.reference_no,
              approverFullName: hrbp.full_name || 'HRBP',
              fullName: reimbursement?.full_name || 'No name set',
              employeeId: reimbursement?.employee_id || 'No employee id set',
              expenseType: reimbursement.expense_type,
              expenseDate: reimbursement.created_at,
              amount: reimbursement.amount,
              receiptsAttached: reimbursement.attachment,
            };

            this.eventEmitter.emit(
              'reimbursement-request-send-email-hrbp-approval',
              hrbpApprovalEmailData,
            );
          }
        }

        return reimbursement;
      });

    return approveReimbursementRequest;
  }
}
