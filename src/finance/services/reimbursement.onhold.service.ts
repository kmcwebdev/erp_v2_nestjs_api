import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { ReimbursementGetOneService } from './reimbursement.get-one.service';
import { ONHOLD_REQUEST } from '../common/constant';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { OnHoldReimbursementRequestType } from '../common/dto/onHoldReimbursementRequest.dto';

@Injectable()
export class ReimbursementOhHoldService {
  private readonly logger = new Logger(ReimbursementOhHoldService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly reimbursementGetOneService: ReimbursementGetOneService,
  ) {}

  async onhold(user: RequestUser, data: OnHoldReimbursementRequestType) {
    try {
      const onHoldRequest = await this.pgsql
        .transaction()
        .execute(async (trx) => {
          const request = await trx
            .updateTable('finance_reimbursement_requests')
            .set({
              is_onhold: true,
              request_status_id: ONHOLD_REQUEST,
            })
            .returning([
              'finance_reimbursement_requests.reimbursement_request_id',
            ])
            .where('finance_reimbursement_requests.is_cancelled', '=', false)
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

          if (!onHoldRequest) {
            throw new HttpException('Request not found', HttpStatus.NOT_FOUND);
          }

          await trx
            .insertInto('finance_reimbursement_approval_audit_logs')
            .values({
              reimbursement_request_id: request.reimbursement_request_id,
              user_id: user.original_user_id,
              description: data.onhold_reason,
            })
            .execute();

          return request;
        });

      return onHoldRequest;
    } catch (error) {
      this.logger.error(error?.message);
      throw new HttpException(
        'Internal query error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
