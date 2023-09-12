import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { RejectReimbursementRequestType } from '../common/dto/rejectReimbursementRequest.dto';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { ReimbursementGetOneService } from './reimbursement.get-one.service';

@Injectable()
export class ReimbursementRejectService {
  private readonly logger = new Logger(ReimbursementRejectService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly reimbursementGetOneService: ReimbursementGetOneService,
  ) {}

  async reject(user: RequestUser, data: RejectReimbursementRequestType) {
    try {
      const rejectReimbursementRequest = await this.pgsql
        .transaction()
        .execute(async (trx) => {
          const updatedReimbursementMatrix = await trx
            .updateTable('finance_reimbursement_approval_matrix')
            .set({
              has_rejected: true,
              performed_by_user_id: user.original_user_id,
              description: data.rejection_reason,
              updated_at: new Date(),
            })
            .leftJoin(
              'finance_reimbursement_requests',
              'reimbursement_request_id',
              'reimbursement_request_id',
            )
            .returning([
              'finance_reimbursement_approval_matrix.reimbursement_request_id',
            ])
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
            .where('finance_reimbursement_requests.is_cancelled', '=', false)
            .executeTakeFirst();

          if (!updatedReimbursementMatrix) {
            return {
              message: 'This request is already approved or cancelled',
            };
          }

          const matrix = await trx
            .selectFrom('finance_reimbursement_approval_matrix')
            .select([
              'finance_reimbursement_approval_matrix.approval_matrix_id',
              'finance_reimbursement_approval_matrix.reimbursement_request_id',
              'finance_reimbursement_approval_matrix.approver_order',
              'finance_reimbursement_approval_matrix.approver_id',
            ])
            .where(
              'finance_reimbursement_approval_matrix.reimbursement_request_id',
              '=',
              updatedReimbursementMatrix.reimbursement_request_id,
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

          if (matrix) {
            await this.pgsql
              .updateTable('finance_reimbursement_requests')
              .set({
                next_approver_order: matrix.approver_order,
              })
              .where(
                'finance_reimbursement_requests.reimbursement_request_id',
                '=',
                updatedReimbursementMatrix.reimbursement_request_id,
              )
              .execute();

            this.logger.log('Sending email to next approver');
          }

          const reimbursement = await this.reimbursementGetOneService.get({
            reimbursement_request_id:
              updatedReimbursementMatrix.reimbursement_request_id,
          });

          return reimbursement;
        });

      return rejectReimbursementRequest;
    } catch (error) {
      this.logger.error(error?.message);
      throw new HttpException(
        'Internal query error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
