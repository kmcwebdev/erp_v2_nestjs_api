import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';

@Injectable()
export class ReimbursementExpenseTypesService {
  private readonly logger = new Logger(ReimbursementExpenseTypesService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(requestTypeId: string) {
    try {
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
    } catch (error) {
      this.logger.error(error?.message);
      throw new HttpException(
        'Internal query error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
