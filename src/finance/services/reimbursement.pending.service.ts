import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { PENDING_REQUEST } from '../common/constant';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { PendingReimbursementRequestType } from '../common/dto/pendingReimbursementRequest.dto';

@Injectable()
export class ReimbursementpPendingService {
  private readonly logger = new Logger(ReimbursementpPendingService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async pending(user: RequestUser, data: PendingReimbursementRequestType) {
    const pendingReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const reimbursementRequest = await trx
          .updateTable('finance_reimbursement_requests')
          .set({
            is_onhold: false,
            request_status_id: PENDING_REQUEST,
          })
          .returning([
            'finance_reimbursement_requests.reimbursement_request_id',
          ])
          .where('finance_reimbursement_requests.is_onhold', '=', false)
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            '=',
            data.reimbursement_request_id,
          )
          .executeTakeFirst();

        if (!reimbursementRequest) {
          return {
            message: 'Request is already put onhold',
          };
        }

        await trx
          .insertInto('finance_reimbursement_approval_audit_logs')
          .values({
            reimbursement_request_id:
              reimbursementRequest.reimbursement_request_id,
            user_id: user.original_user_id,
            description: 'Reimbursement request from on-hold to pending',
          })
          .execute();

        return {
          reimbursement_request_id:
            reimbursementRequest.reimbursement_request_id,
          request_status: 'Pending',
        };
      });

    return pendingReimbursementRequest;
  }
}
