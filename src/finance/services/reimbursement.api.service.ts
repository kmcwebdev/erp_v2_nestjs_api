import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { DB } from 'src/common/types';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import {
  ONHOLD_REQUEST,
  PENDING_REQUEST,
  SCHEDULED_REQUEST,
  UNSCHEDULED_REQUEST,
} from '../common/constant';

@Injectable()
export class ReimbursementApiService {
  private readonly logger = new Logger(ReimbursementApiService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async getReimbursementRequestsAnalyticsForFinance() {
    const [scheduledRequestCount, unScheduledRequestCount, onHoldRequestCount] =
      await Promise.all([
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
        WHERE reimbursement_request_type_id = ${SCHEDULED_REQUEST}`.execute(
          this.pgsql,
        ),
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
        WHERE reimbursement_request_type_id = ${UNSCHEDULED_REQUEST}`.execute(
          this.pgsql,
        ),
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests
        WHERE request_status_id = ${ONHOLD_REQUEST}`.execute(this.pgsql),
      ]);

    return {
      totalScheduledRequest: scheduledRequestCount.rows.length
        ? scheduledRequestCount.rows[0]
        : 0,
      totalUnScheduledRequest: unScheduledRequestCount.rows.length
        ? unScheduledRequestCount.rows[0]
        : 0,
      totalOnholdRequest: onHoldRequestCount.rows.length
        ? onHoldRequestCount.rows[0]
        : 0,
    };
  }

  async getReimbursementRequestsAnalytics(user: RequestUser) {
    const { original_user_id, user_assigned_role } = user;

    const [financeAnalytics, pendingRequestCount, overallRequestCount] =
      await Promise.all([
        this.getReimbursementRequestsAnalyticsForFinance(),
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
        WHERE requestor_id = ${original_user_id}
        AND request_status_id = ${PENDING_REQUEST}`.execute(this.pgsql),
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
        WHERE requestor_id = ${original_user_id}`.execute(this.pgsql),
      ]);

    return {
      myPendingRequest: pendingRequestCount.rows.length
        ? pendingRequestCount.rows[0]
        : 0,
      myTotalRequest: overallRequestCount.rows.length
        ? overallRequestCount.rows[0]
        : 0,
      others: user_assigned_role === 'finance' ? financeAnalytics : null,
    };
  }
}
