import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectKysely } from 'nestjs-kysely';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { DB } from 'src/common/types';
import { ReimbursementGetOneService } from './reimbursement.get-one.service';
import { ReimbursementRequestApprovalType } from '../common/dto/approveReimbursementRequest.dto';
import { sql } from 'kysely';

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

    const approveReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const updatedReimbursementMatrix = await trx
          .updateTable('finance_reimbursement_approval_matrix')
          .set({
            has_approved: true,
            performed_by_user_id: user.original_user_id,
            updated_at: new Date(),
          })
          .returning([
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          ])
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            '=',
            data.approval_matrix_ids[0],
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
          .executeTakeFirst();

        if (!updatedReimbursementMatrix) {
          return {
            message: 'This request is already approved or cancelled',
          };
        }

        const reimbursementRequestApprovalMatrix = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .select([
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.approver_order',
            'finance_reimbursement_approval_matrix.is_hrbp',
          ])
          .where(
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            '=',
            updatedReimbursementMatrix.reimbursement_request_id,
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
          .orderBy(
            'finance_reimbursement_approval_matrix.approver_order',
            'asc',
          )
          .executeTakeFirst();

        if (reimbursementRequestApprovalMatrix) {
          await trx
            .updateTable('finance_reimbursement_requests')
            .set({
              next_approver_order:
                reimbursementRequestApprovalMatrix.approver_order,
            })
            .where(
              'finance_reimbursement_requests.reimbursement_request_id',
              '=',
              updatedReimbursementMatrix.reimbursement_request_id,
            )
            .execute();

          if (reimbursementRequestApprovalMatrix.is_hrbp) {
            await sql`
              UPDATE finance_reimbursement_requests 
              SET payroll_date = 
                  CASE 
                      WHEN EXTRACT(DAY FROM payroll_date) BETWEEN 1 AND 15 THEN
                          DATE_TRUNC('MONTH', payroll_date) + INTERVAL '24 days'
                      ELSE 
                          DATE_TRUNC('MONTH', payroll_date) + INTERVAL '9 days' + INTERVAL '1 month'
                  END
              WHERE reimbursement_request_id = ${reimbursementRequestApprovalMatrix.reimbursement_request_id}
            `.execute(this.pgsql);
          }

          this.logger.log('Sending email to next approver');
        }

        const reimbursement = await this.reimbursementGetOneService.get({
          reimbursement_request_id:
            updatedReimbursementMatrix.reimbursement_request_id,
        });

        return reimbursement;
      });

    return approveReimbursementRequest;
  }
}
