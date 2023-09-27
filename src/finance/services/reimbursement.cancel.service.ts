import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { CancelReimbursementRequestType } from '../common/dto/cancel-reimbursement-request.dto';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import {
  APPROVED_REQUEST,
  CANCELLED_REQUEST,
  PENDING_REQUEST,
  PROCESSING_REQUEST,
  REJECTED_REQUEST,
} from '../common/constant';

@Injectable()
export class ReimbursementCancelService {
  private readonly logger = new Logger(ReimbursementCancelService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async cancel(user: RequestUser, data: CancelReimbursementRequestType) {
    const cancelRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const reimbursementRequest = await trx
          .updateTable('finance_reimbursement_requests')
          .set({
            request_status_id: CANCELLED_REQUEST,
            hrbp_request_status_id: CANCELLED_REQUEST,
            finance_request_status_id: CANCELLED_REQUEST,
          })
          .returning([
            'finance_reimbursement_requests.reimbursement_request_id',
          ])
          .where('finance_reimbursement_requests.request_status_id', 'not in', [
            CANCELLED_REQUEST,
            REJECTED_REQUEST,
          ])
          .where((eb) =>
            eb(
              'finance_reimbursement_requests.request_status_id',
              '=',
              PENDING_REQUEST,
            )
              .or(
                'finance_reimbursement_requests.hrbp_request_status_id',
                '!=',
                APPROVED_REQUEST,
              )
              .or(
                'finance_reimbursement_requests.finance_request_status_id',
                '!=',
                PROCESSING_REQUEST,
              ),
          )
          .where(
            'finance_reimbursement_requests.requestor_id',
            '=',
            user.original_user_id,
          )
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            '=',
            data.reimbursement_request_id,
          )
          .executeTakeFirst();

        if (!reimbursementRequest) {
          throw new HttpException('Request not found', HttpStatus.NOT_FOUND);
        }

        await trx
          .insertInto('finance_reimbursement_approval_audit_logs')
          .values({
            reimbursement_request_id:
              reimbursementRequest.reimbursement_request_id,
            user_id: user.original_user_id,
            description: `${user.email} cancelled this reimbursement request`,
          })
          .execute();

        return {
          reimbursement_request_id:
            reimbursementRequest.reimbursement_request_id,
          request_status: 'Cancelled',
        };
      });

    return cancelRequest;
  }
}
