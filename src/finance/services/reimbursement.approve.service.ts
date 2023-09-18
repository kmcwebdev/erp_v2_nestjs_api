import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectKysely } from 'nestjs-kysely';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { DB } from 'src/common/types';
import { ReimbursementGetOneService } from './reimbursement.get-one.service';
import { ReimbursementRequestApprovalType } from '../common/dto/approve-reimbursement-request.dto';
import { sql } from 'kysely';
import { APPROVED_REQUEST } from '../common/constant';

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
        message: 'Request approval queue started.',
      };
    }

    return this.approveReimbursementRequest(user, data.approval_matrix_ids[0]);
  }

  async approveReimbursementRequest(
    user: RequestUser,
    approval_matrix_ids: string,
  ) {
    const approveReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const reimbursementRequestApprovalApprover = await trx
          .updateTable('finance_reimbursement_approval_matrix')
          .set({
            has_approved: true,
            performed_by_user_id: user.original_user_id,
            updated_at: new Date(),
          })

          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            '=',
            approval_matrix_ids,
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
          ])
          .executeTakeFirst();

        if (!reimbursementRequestApprovalApprover) {
          return {
            message: 'This request is already approved or cancelled',
          };
        }

        const nextReimbursementRequestApprovalApprover = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .select(['finance_reimbursement_approval_matrix.approver_id'])
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
                  hrbp_request_status_id = ${APPROVED_REQUEST}
              WHERE reimbursement_request_id = ${reimbursementRequestApprovalApprover.reimbursement_request_id}
            `.execute(this.pgsql);
        }

        const reimbursement = await this.reimbursementGetOneService.get({
          reimbursement_request_id:
            reimbursementRequestApprovalApprover.reimbursement_request_id,
        });

        if (nextReimbursementRequestApprovalApprover) {
          this.logger.log('Sending email to next approver');
        }

        return reimbursement;
      });

    return approveReimbursementRequest;
  }
}
