import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { sql } from 'kysely';
import { PENDING_REQUEST } from '../common/constant';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';

@Injectable()
export class ReimbursementAnalyticsService {
  private readonly logger = new Logger(ReimbursementAnalyticsService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async member(user: RequestUser) {
    const { getPendingApproval, getOverallRequest } = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const getPendingApproval =
          await sql`SELECT COUNT(*) FROM finance_reimbursement_requests WHERE requestor_id = ${user.original_user_id} AND hrbp_request_status_id = ${PENDING_REQUEST}`.execute(
            trx,
          );

        const getOverallRequest =
          await sql`SELECT COUNT(*) FROM finance_reimbursement_requests WHERE requestor_id = ${user.original_user_id}`.execute(
            trx,
          );

        return { getPendingApproval, getOverallRequest };
      });

    return Object.freeze({ getPendingApproval, getOverallRequest });
  }
}
