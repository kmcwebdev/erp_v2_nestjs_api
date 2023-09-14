import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectKysely } from 'nestjs-kysely';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { DB } from 'src/common/types';
import { CreateReimbursementRequestType } from '../common/dto/createReimbursementRequest.dto';
import { ReimbursementGetOneService } from './reimbursement.get-one.service';

@Injectable()
export class ReimbursementCreateService {
  private readonly logger = new Logger(ReimbursementCreateService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly eventEmitter: EventEmitter2,
    private readonly reimbursementGetOneService: ReimbursementGetOneService,
  ) {}

  async create(user: RequestUser, data: CreateReimbursementRequestType) {
    const { original_user_id } = user;

    const newReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const newReferenceNo = await trx
          .insertInto('finance_reimbursement_reference_numbers')
          .values({
            year: new Date().getFullYear(),
          })
          .returning(['reference_no_id', 'year', 'prefix'])
          .executeTakeFirstOrThrow();

        const newReimbursementRequest = await trx
          .insertInto('finance_reimbursement_requests')
          .values({
            requestor_id: original_user_id,
            reimbursement_request_type_id: data.reimbursement_request_type_id,
            remarks: data?.remarks,
            expense_type_id: data.expense_type_id,
            reference_no: `${newReferenceNo.prefix}${newReferenceNo.year}-${newReferenceNo.reference_no_id}`,
            attachment: data.attachment,
            amount: data.amount,
            dynamic_approvers: data?.approvers?.length
              ? data.approvers.join(',')
              : null,
          })
          .returning('reimbursement_request_id')
          .executeTakeFirstOrThrow();

        if (newReferenceNo && newReimbursementRequest) {
          await trx
            .updateTable('finance_reimbursement_reference_numbers')
            .set({
              reimbursement_request_id:
                newReimbursementRequest.reimbursement_request_id,
            })
            .where('reference_no_id', '=', newReferenceNo.reference_no_id)
            .execute();
        }

        return newReimbursementRequest;
      });

    const request = await this.reimbursementGetOneService.get({
      reimbursement_request_id:
        newReimbursementRequest.reimbursement_request_id,
    });

    this.eventEmitter.emit('reimbursement-request-created', request);

    return request;
  }
}
