import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { ONHOLD_REQUEST } from '../common/constant';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { OnHoldReimbursementRequestType } from '../common/dto/onHoldReimbursementRequest.dto';

@Injectable()
export class ReimbursementOhHoldService {
  private readonly logger = new Logger(ReimbursementOhHoldService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async onhold(user: RequestUser, data: OnHoldReimbursementRequestType) {
    const onHoldRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const reimbursementRequest = await trx
          .updateTable('finance_reimbursement_requests')
          .set({
            request_status_id: ONHOLD_REQUEST,
          })
          .returning([
            'finance_reimbursement_requests.reimbursement_request_id',
          ])
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
            description: data.onhold_reason,
          })
          .execute();

        return {
          reimbursement_request_id:
            reimbursementRequest.reimbursement_request_id,
          request_status: 'On-hold',
          onhold_reason: data.onhold_reason,
        };
      });

    return onHoldRequest;
  }
}
