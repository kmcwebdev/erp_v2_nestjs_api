import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectKysely } from 'nestjs-kysely';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { DB } from 'src/common/types';
import { CreateReimbursementRequestType } from '../common/dto/createReimbursementRequest.dto';

@Injectable()
export class ReimbursementCreateService {
  private readonly logger = new Logger(ReimbursementCreateService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(user: RequestUser, data: CreateReimbursementRequestType) {
    try {
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

          const queryNewReimbursementRequest = await trx
            .selectFrom('finance_reimbursement_requests')
            .innerJoin(
              'finance_reimbursement_request_types',
              'finance_reimbursement_request_types.reimbursement_request_type_id',
              'finance_reimbursement_requests.reimbursement_request_type_id',
            )
            .innerJoin(
              'finance_reimbursement_expense_types',
              'finance_reimbursement_expense_types.expense_type_id',
              'finance_reimbursement_requests.expense_type_id',
            )
            .innerJoin(
              'users',
              'users.user_id',
              'finance_reimbursement_requests.requestor_id',
            )
            .innerJoin(
              'finance_reimbursement_request_status',
              'finance_reimbursement_request_status.request_status_id',
              'finance_reimbursement_requests.request_status_id',
            )
            .select([
              'finance_reimbursement_requests.reimbursement_request_id',
              'finance_reimbursement_requests.reference_no',
              'finance_reimbursement_request_types.reimbursement_request_type_id as request_type_id',
              'finance_reimbursement_request_types.request_type',
              'finance_reimbursement_expense_types.expense_type',
              'finance_reimbursement_request_status.request_status_id',
              'finance_reimbursement_request_status.request_status',
              'finance_reimbursement_requests.attachment',
              'finance_reimbursement_requests.amount',
              'finance_reimbursement_requests.dynamic_approvers',
              'users.user_id',
              'users.full_name',
              'users.client_name',
              'users.email',
              'users.hrbp_approver_email',
              'date_approve',
              'users.employee_id',
              'finance_reimbursement_requests.date_approve',
              'finance_reimbursement_requests.is_cancelled',
              'finance_reimbursement_requests.created_at',
            ])
            .where(
              'reimbursement_request_id',
              '=',
              newReimbursementRequest.reimbursement_request_id,
            )
            .executeTakeFirstOrThrow();

          return queryNewReimbursementRequest;
        });

      this.eventEmitter.emit(
        'reimbursement-request-created',
        newReimbursementRequest,
      );

      return newReimbursementRequest;
    } catch (error) {
      this.logger.error(error?.message);
      throw new HttpException(
        'Internal query error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
