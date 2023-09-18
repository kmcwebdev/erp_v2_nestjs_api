import { Injectable, Logger } from '@nestjs/common';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { RejectReimbursementRequestType } from '../common/dto/reject-reimbursement-request.dto';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { REJECTED_REQUEST } from '../common/constant';

@Injectable()
export class ReimbursementRejectService {
  private readonly logger = new Logger(ReimbursementRejectService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async reject(user: RequestUser, data: RejectReimbursementRequestType) {
    const rejectReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const reimbursementRequestMatrix = await trx
          .updateTable('finance_reimbursement_approval_matrix')
          .set({
            has_rejected: true,
            performed_by_user_id: user.original_user_id,
            description: data.rejection_reason,
            updated_at: new Date(),
          })
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            '=',
            data.approval_matrix_id,
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
          ])
          .executeTakeFirst();

        if (!reimbursementRequestMatrix) {
          return {
            message: 'This request is already approved or rejected',
          };
        }

        const reimbursementRequest = await trx
          .updateTable('finance_reimbursement_requests')
          .set({
            request_status_id: REJECTED_REQUEST,
          })
          .returning([
            'finance_reimbursement_requests.reimbursement_request_id',
          ])
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            '=',
            reimbursementRequestMatrix.reimbursement_request_id,
          )
          .executeTakeFirst();

        return {
          reimbursement_request_id:
            reimbursementRequest.reimbursement_request_id,
          request_status: 'Rejected',
          rejection_reason: data.rejection_reason,
        };
      });

    return rejectReimbursementRequest;
  }
}
