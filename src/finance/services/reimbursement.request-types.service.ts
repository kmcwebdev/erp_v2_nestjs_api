import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';

@Injectable()
export class ReimbursementRequestTypesService {
  private readonly logger = new Logger(ReimbursementRequestTypesService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get() {
    try {
      return await this.pgsql
        .selectFrom('finance_reimbursement_request_types')
        .select(['reimbursement_request_type_id', 'request_type'])
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
