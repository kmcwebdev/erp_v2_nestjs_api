import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';

@Injectable()
export class ReimbursementRequestTypesService {
  private readonly logger = new Logger(ReimbursementRequestTypesService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get() {
    return await this.pgsql
      .selectFrom('finance_reimbursement_request_types')
      .select(['reimbursement_request_type_id', 'request_type'])
      .orderBy('request_type')
      .execute();
  }
}
