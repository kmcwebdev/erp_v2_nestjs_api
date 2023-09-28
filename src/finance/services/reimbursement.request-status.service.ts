import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';

@Injectable()
export class ReimbursementRequestStatusService {
  private readonly logger = new Logger(ReimbursementRequestStatusService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get() {
    return await this.pgsql
      .selectFrom('finance_reimbursement_request_status')
      .select([
        'finance_reimbursement_request_status.request_status_id',
        'finance_reimbursement_request_status.request_status',
      ])
      .execute();
  }
}
