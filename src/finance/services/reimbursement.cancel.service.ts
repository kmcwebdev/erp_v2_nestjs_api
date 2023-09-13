import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { CancelReimbursementRequestType } from '../common/dto/cancelReimbursementRequest.dto';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { CANCELLED_REQUEST } from '../common/constant';
import { ReimbursementGetOneService } from './reimbursement.get-one.service';

@Injectable()
export class ReimbursementCancelService {
  private readonly logger = new Logger(ReimbursementCancelService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly reimbursementGetOneService: ReimbursementGetOneService,
  ) {}

  async cancel(user: RequestUser, data: CancelReimbursementRequestType) {
    const cancelRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const reimbursementRequest = await trx
          .updateTable('finance_reimbursement_requests')
          .set({
            request_status_id: CANCELLED_REQUEST,
          })
          .returning([
            'finance_reimbursement_requests.reimbursement_request_id',
          ])
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
