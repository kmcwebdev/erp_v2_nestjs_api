import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectKysely } from 'nestjs-kysely';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { DB } from 'src/common/types';
import { ReimbursementGetOneService } from './reimbursement.get-one.service';

@Injectable()
export class ReimbursementApproveService {
  private readonly logger = new Logger(ReimbursementApproveService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly eventEmitter: EventEmitter2,
    private readonly reimbursementGetOneService: ReimbursementGetOneService,
  ) {}

  async approve(user: RequestUser, approval_matrix_ids: string[]) {
    try {
      if (approval_matrix_ids.length > 1) {
        this.eventEmitter.emit('reimbursement-request-bulk-approval', {
          user,
          matrixIds: approval_matrix_ids,
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
              approval_matrix_ids[0],
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
              'finance_reimbursement_approval_matrix.has_approved',
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

      return approveReimbursementRequest;
    } catch (error) {
      this.logger.error(error?.message);
      throw new HttpException(
        'Internal query error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}