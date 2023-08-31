import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { CreateReimbursementRequestType } from 'src/finance/common/dto/createReimbursementRequest.dto';
import { GetAllReimbursementRequestType } from '../common/dto/getAllReimbursementRequest.dto';
import { User } from '@propelauth/node';

@Injectable()
export class ReimbursementApiService {
  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async getRequestTypes() {
    return await this.pgsql
      .selectFrom('finance_reimbursement_request_types')
      .select(['reimbursement_request_type_id', 'request_type'])
      .execute();
  }

  async getExpenseTypes(requestTypeId: string) {
    return await this.pgsql
      .selectFrom('finance_reimbursement_request_expense_types')
      .innerJoin(
        'finance_reimbursement_expense_types',
        'finance_reimbursement_expense_types.expense_type_id',
        'finance_reimbursement_request_expense_types.expense_type_id',
      )
      .select([
        'finance_reimbursement_request_expense_types.expense_type_id',
        'finance_reimbursement_expense_types.expense_type',
      ])
      .where(
        'finance_reimbursement_request_expense_types.reimbursement_request_type_id',
        '=',
        requestTypeId,
      )
      .execute();
  }

  async getAllReimbursementRequest(
    user: User,
    data: GetAllReimbursementRequestType,
  ) {
    const { userId } = user;

    let query = this.pgsql
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
        'finance_reimbursement_request_status',
        'finance_reimbursement_request_status.request_status_id',
        'finance_reimbursement_requests.request_status_id',
      )
      .innerJoin(
        'users',
        'users.user_id',
        'finance_reimbursement_requests.requestor_id',
      )
      .select([
        'finance_reimbursement_requests.reimbursement_request_id',
        'finance_reimbursement_requests.reference_no',
        'finance_reimbursement_request_types.request_type',
        'finance_reimbursement_expense_types.expense_type',
        'finance_reimbursement_request_status.request_status',
        'finance_reimbursement_requests.amount',
        'finance_reimbursement_requests.attachment',
        'users.full_name',
        'users.email',
        'users.employee_id',
        'finance_reimbursement_requests.date_approve',
      ]);

    if (data?.reimbursement_type_id) {
      query = query.where(
        'finance_reimbursement_requests.reimbursement_request_type_id',
        '=',
        data.reimbursement_type_id,
      );
    }

    // TODO: Limit who can search request by requestor_id to admin only
    if (data?.requestor_id) {
      query = query.where(
        'finance_reimbursement_requests.requestor_id',
        '=',
        data.request_status_id,
      );
    }

    return await query.limit(10).execute();
  }

  async createReimbursementRequest(
    user: User,
    data: CreateReimbursementRequestType,
  ) {
    const { userId } = user;

    const newReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const queryUser = await trx
          .selectFrom('users')
          .select('user_id')
          .where('users.propelauth_user_id', '=', userId)
          .executeTakeFirstOrThrow();

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
            requestor_id: queryUser.user_id,
            reimbursement_request_type_id: data.reimbursement_request_type_id,
            expense_type_id: data.expense_type_id,
            reference_no: `${newReferenceNo.prefix}${newReferenceNo.year}-${newReferenceNo.reference_no_id}`,
            attachment: data.attachment,
            amount: data.amount,
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
            'reimbursement_request_id',
            'reference_no',
            'finance_reimbursement_request_types.request_type',
            'finance_reimbursement_expense_types.expense_type',
            'users.full_name',
            'users.client_name',
            'users.email',
            'attachment',
            'amount',
            'finance_reimbursement_request_status.request_status',
            'date_approve',
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

    return newReimbursementRequest;
  }

  async scheduledReimbursementRequestApprovalRouting(
    reimbursementRequestId: string,
  ) {
    return reimbursementRequestId;
  }

  async unScheduledReimbursementRequestApprovalRouting(
    reimbursementRequestId: string,
  ) {
    return reimbursementRequestId;
  }
}
