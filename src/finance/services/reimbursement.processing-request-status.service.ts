import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { PROCESSING_REQUEST } from '../common/constant';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { ProcessingStatusReimbursementRequestType } from '../common/dto/processingStatusReimbursementRequest.dto';

@Injectable()
export class ReimbursementpProcessingRequestStatusService {
  private readonly logger = new Logger(
    ReimbursementpProcessingRequestStatusService.name,
  );

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async processing(
    user: RequestUser,
    data: ProcessingStatusReimbursementRequestType,
  ) {
    const processingReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const reimbursementRequest = await trx
          .updateTable('finance_reimbursement_requests')
          .set({
            request_status_id: PROCESSING_REQUEST,
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
            message: 'Request is already processed',
          };
        }

        await trx
          .insertInto('finance_reimbursement_approval_audit_logs')
          .values({
            reimbursement_request_id:
              reimbursementRequest.reimbursement_request_id,
            user_id: user.original_user_id,
            description: 'Reimbursement request change status to processing',
          })
          .execute();

        return {
          reimbursement_request_id:
            reimbursementRequest.reimbursement_request_id,
          request_status: 'Processing',
        };
      });

    return processingReimbursementRequest;
  }
}
