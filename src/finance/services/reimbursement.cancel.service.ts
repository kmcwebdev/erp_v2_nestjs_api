import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { CancelReimbursementRequestType } from '../common/dto/cancelReimbursementRequest.dto';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';

@Injectable()
export class ReimbursementCancelService {
  private readonly logger = new Logger(ReimbursementCancelService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async cancel(user: RequestUser, data: CancelReimbursementRequestType) {
    try {
      const cancellRequest = await this.pgsql
        .updateTable('finance_reimbursement_requests')
        .set({
          is_cancelled: true,
        })
        .returning(['finance_reimbursement_requests.reimbursement_request_id'])
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

      if (!cancellRequest) {
        throw new HttpException('Request not found', HttpStatus.NOT_FOUND);
      }

      return cancellRequest;
    } catch (error) {
      this.logger.error(error?.message);
      throw new HttpException(
        'Internal query error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
