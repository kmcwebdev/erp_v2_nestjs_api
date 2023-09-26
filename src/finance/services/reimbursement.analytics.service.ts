import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { sql } from 'kysely';
import {
  APPROVED_REQUEST,
  CANCELLED_REQUEST,
  ONHOLD_REQUEST,
  PENDING_REQUEST,
  SCHEDULED_REQUEST,
  UNSCHEDULED_REQUEST,
} from '../common/constant';
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
          await sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
            WHERE requestor_id = ${user.original_user_id} 
            AND hrbp_request_status_id = ${PENDING_REQUEST}`.execute(trx);

        const getOverallRequest =
          await sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
            WHERE requestor_id = ${user.original_user_id}`.execute(trx);

        return { getPendingApproval, getOverallRequest };
      });

    return { getPendingApproval, getOverallRequest };
  }

  async hrbp(user: RequestUser) {
    const { pendingApproval, scheduled, unscheduled } = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const approverIds = await trx
          .selectFrom('finance_reimbursement_approvers')
          .select(['approver_id'])
          .where(
            'finance_reimbursement_approvers.signatory_id',
            '=',
            user.original_user_id,
          )
          .execute();

        if (approverIds.length === 0 || user.user_assigned_role != 'hrbp') {
          return {
            pendingApproval: {
              count: 0,
            },
            scheduled: {
              count: 0,
            },
            unscheduled: {
              count: 0,
            },
          };
        }

        const matrix = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .select(['approval_matrix_id', 'approver_order'])
          .where(
            'approver_id',
            'in',
            approverIds.map((ap) => ap.approver_id),
          )
          .where('has_approved', '=', false)
          .where('has_rejected', '=', false)
          .execute();

        const pendingApproval = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select(({ fn }) => fn.countAll().as('count'))
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'in',
            matrix.map((mt) => mt.approval_matrix_id),
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '!=',
            CANCELLED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.hrbp_request_status_id',
            '!=',
            PENDING_REQUEST,
          )
          .executeTakeFirst();

        const scheduled = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select(({ fn }) => fn.countAll().as('count'))
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'in',
            matrix.map((mt) => mt.approval_matrix_id),
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '=',
            SCHEDULED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '!=',
            CANCELLED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.hrbp_request_status_id',
            '!=',
            PENDING_REQUEST,
          )
          .executeTakeFirst();

        const unscheduled = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select(({ fn }) => fn.countAll().as('count'))
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'in',
            matrix.map((mt) => mt.approval_matrix_id),
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '=',
            UNSCHEDULED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '!=',
            CANCELLED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.hrbp_request_status_id',
            '!=',
            PENDING_REQUEST,
          )
          .executeTakeFirst();

        return {
          pendingApproval,
          scheduled,
          unscheduled,
        };
      });

    return {
      pendingApproval,
      scheduled,
      unscheduled,
    };
  }

  async manager(user: RequestUser) {
    const { pendingApproval, overall } = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const approverIds = await trx
          .selectFrom('finance_reimbursement_approvers')
          .select(['approver_id'])
          .where(
            'finance_reimbursement_approvers.signatory_id',
            '=',
            user.original_user_id,
          )
          .execute();

        if (approverIds.length === 0) {
          return {
            pendingApproval: {
              count: 0,
            },
            overall: {
              count: 0,
            },
          };
        }

        const matrix = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .select(['approval_matrix_id', 'approver_order'])
          .where(
            'approver_id',
            'in',
            approverIds.map((ap) => ap.approver_id),
          )
          .where('has_approved', '=', false)
          .where('has_rejected', '=', false)
          .execute();

        const pendingApproval = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select(({ fn }) => fn.countAll().as('count'))
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'in',
            matrix.map((mt) => mt.approval_matrix_id),
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '!=',
            CANCELLED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '!=',
            PENDING_REQUEST,
          )
          .executeTakeFirst();

        const overall = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select(({ fn }) => fn.countAll().as('count'))
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'in',
            matrix.map((mt) => mt.approval_matrix_id),
          )
          .executeTakeFirst();

        return {
          pendingApproval,
          overall,
        };
      });

    return { pendingApproval, overall };
  }

  async finance(user: RequestUser) {
    const { pendingApproval, scheduled, unscheduled, onhold } = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const approverIds = await trx
          .selectFrom('finance_reimbursement_approvers')
          .select(['approver_id'])
          .where(
            'finance_reimbursement_approvers.signatory_id',
            '=',
            user.original_user_id,
          )
          .execute();

        if (approverIds.length === 0 || user.user_assigned_role != 'finance') {
          return {
            pendingApproval: {
              count: 0,
            },
            scheduled: {
              count: 0,
            },
            unscheduled: {
              count: 0,
            },
            onhold: {
              count: 0,
            },
          };
        }

        const matrix = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .select(['approval_matrix_id', 'approver_order'])
          .where(
            'approver_id',
            'in',
            approverIds.map((ap) => ap.approver_id),
          )
          .where('has_approved', '=', false)
          .where('has_rejected', '=', false)
          .execute();

        const pendingApproval = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select(({ fn }) => fn.countAll().as('count'))
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'in',
            matrix.map((mt) => mt.approval_matrix_id),
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '!=',
            CANCELLED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.hrbp_request_status_id',
            '!=',
            APPROVED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.finance_request_status_id',
            '!=',
            PENDING_REQUEST,
          )
          .executeTakeFirst();

        const scheduled = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select(({ fn }) => fn.countAll().as('count'))
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'in',
            matrix.map((mt) => mt.approval_matrix_id),
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '=',
            SCHEDULED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '!=',
            CANCELLED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.hrbp_request_status_id',
            '!=',
            APPROVED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.finance_request_status_id',
            '!=',
            PENDING_REQUEST,
          )
          .executeTakeFirst();

        const unscheduled = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select(({ fn }) => fn.countAll().as('count'))
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'in',
            matrix.map((mt) => mt.approval_matrix_id),
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '=',
            UNSCHEDULED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '!=',
            CANCELLED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.hrbp_request_status_id',
            '!=',
            APPROVED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.finance_request_status_id',
            '!=',
            PENDING_REQUEST,
          )
          .executeTakeFirst();

        const onhold = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_requests',
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          )
          .select(({ fn }) => fn.countAll().as('count'))
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'in',
            matrix.map((mt) => mt.approval_matrix_id),
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '=',
            UNSCHEDULED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.request_status_id',
            '!=',
            CANCELLED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.hrbp_request_status_id',
            '!=',
            APPROVED_REQUEST,
          )
          .where(
            'finance_reimbursement_requests.finance_request_status_id',
            '!=',
            ONHOLD_REQUEST,
          )
          .executeTakeFirst();

        return {
          pendingApproval,
          scheduled,
          unscheduled,
          onhold,
        };
      });

    return {
      pendingApproval,
      scheduled,
      unscheduled,
      onhold,
    };
  }
}
